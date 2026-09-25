import styles from "./Mascot.module.css";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const CAST = {
  kalko: { src: "/kalko-mascota.webp", name: "Kalko" },
  electrica: { src: "/pelusa-electrica.webp", name: "Pelusa Eléctrica" },
  chill: { src: "/pelusa-chill.webp", name: "Pelusa Chill" },
};

export type MascotName = keyof typeof CAST;

type Props = {
  who?: MascotName;
  size?: number;
  /** Texto del globo; sin texto, solo la mascota. */
  says?: React.ReactNode;
  side?: "left" | "right";
  className?: string;
};

/** Kalko (jefe del laboratorio) y sus pelusas ayudantes. */
export function Mascot({ who = "kalko", size = 120, says, side = "right", className }: Props) {
  const m = CAST[who];
  return (
    <div className={`${styles.mascot} ${className ?? ""}`} data-side={side}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${BASE}${m.src}`}
        alt={says ? "" : m.name}
        width={size}
        height={size}
        className={styles.face}
        style={{ width: size, height: size }}
      />
      {says && (
        <p className={styles.bubble}>
          <span className={styles.speaker}>{m.name}</span>
          {says}
        </p>
      )}
    </div>
  );
}
