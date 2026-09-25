import type { Finish } from "@/lib/diecut";

export type Example = {
  id: string;
  idea: string;
  answers: string[];
  name: string;
  style: string;
  seconds: number;
  image: string;
  reference?: string;
  finish: Finish;
};

// Generados con la propia app (entrevista, respuestas elegidas, opción y
// generación), tiempos reales de generación de la imagen.
export const EXAMPLES: Example[] = [
  {
    "id": "tux-bugs",
    "idea": "Tux, el pingüino de Linux, peleando contra bugs con una espada de energía en una batalla espacial épica",
    "answers": [
      "Cómic épico",
      "Azules y violetas",
      "«¡A combatir bugs!»"
    ],
    "name": "Tux al Asalto",
    "style": "Cómic heroico de acción frontal",
    "seconds": 52.7,
    "image": "/examples/tux-bugs.webp",
    "finish": {
      "width": "grueso",
      "color": "holo",
      "cutLine": false
    }
  },
  {
    "id": "sobrino",
    "idea": "Toma este dibujo que hizo mi sobrino y conviértelo en figuritas",
    "answers": [
      "Cómic limpio",
      "Vivos, como el original",
      "Solo el dragón rojo"
    ],
    "name": "Dragón de Frente",
    "style": "Cómic limpio, retrato frontal",
    "seconds": 11.5,
    "image": "/examples/sobrino.webp",
    "finish": {
      "width": "medio",
      "color": "blanco",
      "cutLine": true
    },
    "reference": "/examples/ref-sobrino.webp"
  },
  {
    "id": "rana-it",
    "idea": "Una rana superhéroe original con capa levantando el ánimo del equipo de IT",
    "answers": [
      "Cómic dinámico",
      "Verde y azul eléctrico",
      "«IT al rescate»",
      "Puño en alto"
    ],
    "name": "Rana de Guardia",
    "style": "Cómic heroico de perspectiva baja",
    "seconds": 11.1,
    "image": "/examples/rana-it.webp",
    "finish": {
      "width": "medio",
      "color": "portal",
      "cutLine": false
    }
  },
  {
    "id": "lgtm",
    "idea": "Un científico loco de pelo alborotado y su ayudante adolescente nervioso diciendo LGTM",
    "answers": [
      "Cómic caricaturesco",
      "Verde y violeta",
      "Globo de diálogo"
    ],
    "name": "¡Ciencia aprobada!",
    "style": "Cómic caricaturesco dinámico",
    "seconds": 12.3,
    "image": "/examples/lgtm.webp",
    "finish": {
      "width": "medio",
      "color": "blanco",
      "cutLine": false
    }
  },
  {
    "id": "webflow",
    "idea": "Un cohete despegando desde Webflow Cloud con el texto «Deploy en Webflow»",
    "answers": [
      "Cómic vibrante",
      "Azul Webflow y violeta",
      "«Deploy en Webflow»"
    ],
    "name": "Despegue Turbo",
    "style": "Cómic dinámico, diagonales explosivas",
    "seconds": 12.1,
    "image": "/examples/webflow.webp",
    "finish": {
      "width": "medio",
      "color": "blanco",
      "cutLine": false
    }
  },
  {
    "id": "aprobado",
    "idea": "Un personaje con peluca rubia, bigote grande, camisa a cuadros, tiradores bávaros y una jarra en la mano aprobando mi código",
    "answers": [
      "Cartoon expresivo",
      "Pulgar arriba",
      "“¡Código aprobado!”"
    ],
    "name": "Brindis Aprobado",
    "style": "Cartoon clásico, cálido y expresivo",
    "seconds": 12.9,
    "image": "/examples/aprobado.webp",
    "finish": {
      "width": "grueso",
      "color": "blanco",
      "cutLine": false
    }
  },
  {
    "id": "carpincho",
    "idea": "Un carpincho astronauta tomando mate en la luna",
    "answers": [
      "Tierno y caricaturesco",
      "Colores vibrantes",
      "“Mate cósmico”"
    ],
    "name": "Mate Lunar",
    "style": "Caricatura tierna, pose clásica",
    "seconds": 11.7,
    "image": "/examples/carpincho.webp",
    "finish": {
      "width": "medio",
      "color": "holo",
      "cutLine": false
    }
  },
  {
    "id": "cafe",
    "idea": "Una taza de café en llamas diciendo 'funciona en mi máquina'",
    "answers": [
      "Cómic expresivo",
      "Cálidos intensos",
      "Sonrisa confiada"
    ],
    "name": "Café Invencible",
    "style": "Cómic clásico, explosivo y cálido",
    "seconds": 12,
    "image": "/examples/cafe.webp",
    "finish": {
      "width": "fino",
      "color": "portal",
      "cutLine": false
    }
  },
  {
    "id": "gato-force",
    "idea": "Un gato durmiendo sobre el teclado mientras en la pantalla dice git push --force",
    "answers": [
      "Kawaii con líneas limpias",
      "Negro y verde terminal",
      "Simple y legible"
    ],
    "name": "Push de Siesta",
    "style": "Kawaii limpio, vista frontal",
    "seconds": 10.9,
    "image": "/examples/gato-force.webp",
    "finish": {
      "width": "medio",
      "color": "blanco",
      "cutLine": false
    }
  },
  {
    "id": "patito",
    "idea": "Un patito de goma detective depurando código con una lupa",
    "answers": [
      "Cómic simpático",
      "Amarillo y azul",
      "«Bug bajo lupa»"
    ],
    "name": "Pico Detective",
    "style": "Cómic simpático clásico",
    "seconds": 11.8,
    "image": "/examples/patito.webp",
    "finish": {
      "width": "medio",
      "color": "blanco",
      "cutLine": true
    }
  },
  {
    "id": "server",
    "idea": "Un servidor de rack feliz y orgulloso con un cartel de 99,99 % uptime",
    "answers": [
      "Pixel art retro",
      "Grises y verde neón",
      "Pulgares arriba"
    ],
    "name": "Rack Triunfador",
    "style": "Pixel art retro frontal y contundente",
    "seconds": 11.2,
    "image": "/examples/server.webp",
    "finish": {
      "width": "grueso",
      "color": "portal",
      "cutLine": false
    }
  }
];
