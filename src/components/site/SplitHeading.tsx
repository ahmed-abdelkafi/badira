import type { ElementType, ReactNode } from "react";

/**
 * Splits a heading into words wrapped in overflow masks; each word slides up
 * with a stagger when the heading enters the viewport (CSS scroll-driven
 * animation on the inner spans → no JS animation cost per word).
 */
export function SplitHeading({
  text,
  as: Tag = "h2",
  className = "",
  delay = 0,
  stagger = 0.06,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  delay?: number;
  stagger?: number;
}): ReactNode {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <Tag className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden="true" className="inline-block overflow-clip pb-[0.08em] align-bottom">
          <span
            data-reveal="word"
            className="inline-block"
            style={{ ["--reveal-i" as string]: Math.round(delay * 10) + i * Math.max(1, Math.round(stagger * 20)) }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </span>
        </span>
      ))}
    </Tag>
  );
}
