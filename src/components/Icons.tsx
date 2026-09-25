type P = { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const UploadIcon = ({ size = 28 }: P) => (
  <svg {...base(size)}>
    <path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5" />
    <path d="M4 14.5v3A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-3" />
  </svg>
);

export const DownloadIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M12 4v11m0 0 4.5-4.5M12 15l-4.5-4.5" />
    <path d="M5 20h14" />
  </svg>
);

export const RetryIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M20 12a8 8 0 1 1-2.34-5.66" />
    <path d="M20 4v4.5h-4.5" />
  </svg>
);

export const SheetIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M6.5 3h8L19 7.5V19a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
    <circle cx="9.5" cy="10.5" r="2" />
    <circle cx="14.5" cy="15.5" r="2" />
  </svg>
);

export const WandIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="m4 20 11-11" />
    <path d="m13.5 7.5 3 3" />
    <path d="M18 3v3M16.5 4.5h3M20 9v2M19 10h2M9 3v2M8 4h2" />
  </svg>
);

export const UndoIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
);

export const ShareIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <circle cx="18" cy="5.5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="18.5" r="2.5" />
    <path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1" />
  </svg>
);

export const GalleryIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
    <path d="M17 13.5v7M13.5 17h7" />
  </svg>
);

export const BackIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M19 12H5m0 0 6-6m-6 6 6 6" />
  </svg>
);

export const CloseIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

/** Frasco de laboratorio: logo de Kalko. */
export const FlaskIcon = ({ size = 34 }: P) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
    <path
      d="M12 3h8M13.5 3v8.2L6.2 24.5A3 3 0 0 0 8.8 29h14.4a3 3 0 0 0 2.6-4.5L18.5 11.2V3"
      fill="none"
      stroke="var(--ink)"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 3h8M13.5 3v8.2L6.2 24.5A3 3 0 0 0 8.8 29h14.4a3 3 0 0 0 2.6-4.5L18.5 11.2V3"
      fill="var(--void-3)"
      stroke="var(--text)"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M9.2 19.5c2.2-1.3 4.4 1.2 6.8 0s4.6-1.2 6.8 0l2.6 4.9A2.6 2.6 0 0 1 23 28H9a2.6 2.6 0 0 1-2.4-3.6z" fill="var(--portal)" />
    <circle cx="14" cy="23.5" r="1.4" fill="var(--goo)" />
    <circle cx="18.6" cy="25.2" r="0.9" fill="var(--goo)" />
  </svg>
);
