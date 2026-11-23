/**
 * La Badira identity.
 * Mark: a full moon ("Badira" — as luminous as the full moon) inside a
 * Tunisian horseshoe arch, above the line of the sea at Hammamet.
 * The wordmark is always LTR and never translated.
 */

export function LogoMark({ className = "", title = "La Badira", moon = "#B69A72" }: { className?: string; title?: string; moon?: string }) {
  return (
    <svg
      viewBox="0 0 64 80"
      className={className}
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}
      fill="none"
      stroke="currentColor"
      strokeLinecap="square"
    >
      <path d="M18 74 V45 A18 18 0 1 1 46 45 V74" strokeWidth="1.8" />
      <path d="M23 74 V46 A12.5 12.5 0 1 1 41 46 V74" strokeWidth=".8" opacity=".5" />
      <circle cx="32" cy="34" r="5.6" fill={moon} stroke="none" />
      <path d="M8 74 H56" strokeWidth="1.8" />
      <path d="M26 68.5 H38" strokeWidth=".9" />
      <path d="M29 63.5 H35" strokeWidth=".9" />
    </svg>
  );
}

/** Horizontal wordmark (header, compact uses). */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 40" className={className} role="img" aria-label="La Badira" style={{ direction: "ltr" }}>
      <text
        x="180"
        y="30"
        textAnchor="middle"
        fill="currentColor"
        style={{ fontFamily: "var(--font-bodoni), 'Bodoni Moda', Didot, serif", fontSize: 30, letterSpacing: "0.42em" }}
      >
        LA BADIRA
      </text>
    </svg>
  );
}

/** Full lockup: mark + wordmark + place line (footer, documents, login). */
export function Lockup({ className = "", place = "HAMMAMET · TUNISIE" }: { className?: string; place?: string }) {
  return (
    <svg viewBox="0 0 360 172" className={className} role="img" aria-label="La Badira, Hammamet" style={{ direction: "ltr" }}>
      <g transform="translate(148 0)" fill="none" stroke="currentColor" strokeLinecap="square">
        <path d="M18 74 V45 A18 18 0 1 1 46 45 V74" strokeWidth="1.8" />
        <path d="M23 74 V46 A12.5 12.5 0 1 1 41 46 V74" strokeWidth=".8" opacity=".5" />
        <circle cx="32" cy="34" r="5.6" fill="#B69A72" stroke="none" />
        <path d="M8 74 H56" strokeWidth="1.8" />
        <path d="M26 68.5 H38" strokeWidth=".9" />
        <path d="M29 63.5 H35" strokeWidth=".9" />
      </g>
      <text x="180" y="128" textAnchor="middle" fill="currentColor" style={{ fontFamily: "var(--font-bodoni), 'Bodoni Moda', Didot, serif", fontSize: 34, letterSpacing: "0.38em" }}>
        LA BADIRA
      </text>
      <text x="180" y="160" textAnchor="middle" fill="currentColor" opacity=".7" style={{ fontFamily: "var(--font-jost), 'Jost', Arial, sans-serif", fontSize: 10, letterSpacing: "0.7em" }}>
        {place}
      </text>
    </svg>
  );
}
