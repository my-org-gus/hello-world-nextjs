import styles from "./Portal.module.css";

type Props = {
  size?: "hero" | "small";
  state?: "idle" | "charging" | "open";
  children?: React.ReactNode;
};

/** Portal verde que gira. `charging` acelera el giro mientras la IA trabaja. */
export function Portal({ size = "hero", state = "idle", children }: Props) {
  return (
    <div className={styles.portal} data-size={size} data-state={state}>
      <div className={styles.rim} aria-hidden />
      <div className={styles.swirl} aria-hidden />
      <div className={styles.swirlInner} aria-hidden />
      <div className={styles.core} aria-hidden />
      {children && <div className={styles.content}>{children}</div>}
    </div>
  );
}

/** Filtro SVG que deforma el giro para que parezca líquido. Montar una vez. */
export function PortalFilters() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <filter id="portal-goo">
        <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="7">
          <animate attributeName="baseFrequency" dur="14s" values="0.012;0.02;0.012" repeatCount="indefinite" />
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" scale="38" />
      </filter>
    </svg>
  );
}
