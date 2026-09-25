// Sesión de administración sin base de datos: la cookie lleva un vencimiento
// firmado con HMAC usando ADMIN_PASSWORD como clave. Cambiar la contraseña
// invalida todas las sesiones abiertas.

export const ADMIN_COOKIE = "kalko_admin";
const SESSION_SECONDS = 12 * 60 * 60;

function credentials() {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  if (!user || !password) return undefined;
  return { user, password };
}

export const adminConfigured = () => Boolean(credentials());

const enc = new TextEncoder();

async function hmac(key: string, message: string) {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Comparación en tiempo constante de dos strings hex del mismo largo. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Compara usuario y contraseña sin filtrar por tiempo cuál falló. */
export async function checkCredentials(user: string, password: string) {
  const c = credentials();
  if (!c) return false;
  const salt = "kalko-login";
  const [a, b, x, y] = await Promise.all([
    hmac(salt, user),
    hmac(salt, c.user),
    hmac(salt, password),
    hmac(salt, c.password),
  ]);
  const okUser = safeEqual(a, b);
  const okPass = safeEqual(x, y);
  return okUser && okPass;
}

export async function createSession() {
  const c = credentials()!;
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const sig = await hmac(c.password, `${c.user}:${exp}`);
  return {
    value: `${exp}.${sig}`,
    cookie: `${ADMIN_COOKIE}=${exp}.${sig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`,
  };
}

export const clearSessionCookie = `${ADMIN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export async function isAdmin(request: Request) {
  const c = credentials();
  if (!c) return false;
  const raw = request.headers
    .get("cookie")
    ?.split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${ADMIN_COOKIE}=`))
    ?.slice(ADMIN_COOKIE.length + 1);
  if (!raw) return false;
  const [expStr, sig] = raw.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || exp < Date.now() / 1000) return false;
  return safeEqual(sig, await hmac(c.password, `${c.user}:${exp}`));
}

export function unauthorized() {
  return Response.json({ error: "Sesión vencida o inválida. Vuelve a ingresar." }, { status: 401 });
}
