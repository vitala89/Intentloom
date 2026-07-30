import { useId } from "react";
import type { SVGProps } from "react";

/* The Intentloom mark: two woven loops on the diagonals - one strand passes
   over, the other is cut where it goes under. Geometry is authored at 1024 and
   scales losslessly; assets/logo-mark.svg carries the same path data.

   The weave is cut into the path data rather than masked, so two marks can
   render in one document without any identifier colliding. Only the gradient
   needs a unique id, and that comes from useId. */
const MARK = (
  <>
    <path
      fillRule="evenodd"
      d="M747.97 449.97L449.97 747.97A123 123 0 0 1 276.03 574.03L574.03 276.03A123 123 0 0 1 747.97 449.97ZM691.41 393.41L393.41 691.41A43 43 0 0 1 332.59 630.59L630.59 332.59A43 43 0 0 1 691.41 393.41Z"
    />
    <path d="M495.03 321.09L449.97 276.03A123 123 0 0 0 276.03 449.97L321.09 495.03A12 12 0 0 0 338.06 495.03L377.65 455.44A12 12 0 0 0 377.65 438.47L332.59 393.41A43 43 0 0 1 393.41 332.59L438.47 377.65A12 12 0 0 0 455.44 377.65L495.03 338.06A12 12 0 0 0 495.03 321.09Z" />
    <path d="M528.97 702.91L574.03 747.97A123 123 0 0 0 747.97 574.03L702.91 528.97A12 12 0 0 0 685.94 528.97L646.35 568.56A12 12 0 0 0 646.35 585.53L691.41 630.59A43 43 0 0 1 630.59 691.41L585.53 646.35A12 12 0 0 0 568.56 646.35L528.97 685.94A12 12 0 0 0 528.97 702.91Z" />
    <path d="M615.24 458.26L575.64 497.86A12 12 0 0 1 558.67 497.86L526.14 465.33A12 12 0 0 1 526.14 448.36L565.74 408.76A12 12 0 0 1 582.71 408.76L615.24 441.29A12 12 0 0 1 615.24 458.26Z" />
    <path d="M408.76 565.74L448.36 526.14A12 12 0 0 1 465.33 526.14L497.86 558.67A12 12 0 0 1 497.86 575.64L458.26 615.24A12 12 0 0 1 441.29 615.24L408.76 582.71A12 12 0 0 1 408.76 565.74Z" />
  </>
);

/* Below ~22px the two floating cross pieces close up into dots - the simplified
   cut drops them and widens the weave gap so the knot still reads. */
const MARK_SMALL = (
  <>
    <path
      fillRule="evenodd"
      d="M747.97 449.97L449.97 747.97A123 123 0 0 1 276.03 574.03L574.03 276.03A123 123 0 0 1 747.97 449.97ZM691.41 393.41L393.41 691.41A43 43 0 0 1 332.59 630.59L630.59 332.59A43 43 0 0 1 691.41 393.41Z"
    />
    <path d="M489.37 315.43L449.97 276.03A123 123 0 0 0 276.03 449.97L315.43 489.37A12 12 0 0 0 332.4 489.37L371.99 449.78A12 12 0 0 0 371.99 432.81L332.59 393.41A43 43 0 0 1 393.41 332.59L432.81 371.99A12 12 0 0 0 449.78 371.99L489.37 332.4A12 12 0 0 0 489.37 315.43Z" />
    <path d="M534.63 708.57L574.03 747.97A123 123 0 0 0 747.97 574.03L708.57 534.63A12 12 0 0 0 691.6 534.63L652.01 574.22A12 12 0 0 0 652.01 591.19L691.41 630.59A43 43 0 0 1 630.59 691.41L591.19 652.01A12 12 0 0 0 574.22 652.01L534.63 691.6A12 12 0 0 0 534.63 708.57Z" />
  </>
);

export interface LogoMarkProps extends Omit<
  SVGProps<SVGSVGElement>,
  "size" | "title"
> {
  /** Any size. Below 22px the component automatically swaps to the simplified cut. */
  size?: number;
  /** `gradient` = brand gradient; `mono` = inherits `currentColor` for one-colour use. */
  tone?: "gradient" | "mono";
  /** Accessible name; pass "" when a sibling already names the lockup. */
  title?: string;
}

export function LogoMark({
  size = 24,
  tone = "gradient",
  title = "Intentloom",
  ...rest
}: LogoMarkProps) {
  const uid = useId().replace(/:/g, "");
  const fill = tone === "gradient" ? `url(#g${uid})` : "currentColor";
  return (
    <svg
      viewBox="240 240 544 544"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      style={{ display: "block", flex: "0 0 auto" }}
      {...rest}
    >
      {tone === "gradient" ? (
        <defs>
          <linearGradient
            id={`g${uid}`}
            gradientUnits="userSpaceOnUse"
            x1="720"
            y1="200"
            x2="330"
            y2="880"
          >
            <stop offset="0" stopColor="#4A9AF9" />
            <stop offset=".22" stopColor="#3D8DF8" />
            <stop offset=".41" stopColor="#3B5FF4" />
            <stop offset=".55" stopColor="#5A4FF2" />
            <stop offset=".73" stopColor="#6E46EE" />
            <stop offset="1" stopColor="#8250F0" />
          </linearGradient>
        </defs>
      ) : null}
      <g fill={fill}>{size < 22 ? MARK_SMALL : MARK}</g>
    </svg>
  );
}

export interface LogoProps {
  variant?: "lockup" | "mark" | "stacked";
  /** Mark box in px; the wordmark scales from it. */
  size?: number;
  tone?: "gradient" | "mono";
  /** Show the version string. Requires `version`; nothing renders without it. */
  showVersion?: boolean;
  /**
   * Version to display. There is deliberately no default: a hardcoded fallback
   * would render a stale version as though it were the running one.
   */
  version?: string;
}

/** Mark + wordmark. `variant="mark"` for the symbol alone, `"stacked"` for the vertical lockup. */
export function Logo({
  variant = "lockup",
  size = 24,
  tone = "gradient",
  showVersion,
  version,
}: LogoProps) {
  if (variant === "mark") return <LogoMark size={size} tone={tone} />;
  const word = (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 6,
        minWidth: 0,
      }}
    >
      <span
        style={{
          font: `600 ${size * 0.94}px/1 var(--font-display)`,
          letterSpacing: "-0.022em",
          color: "var(--text-primary)",
        }}
      >
        Intentloom
      </span>
      {showVersion && version ? (
        <span
          style={{
            font: "400 var(--caption-size)/1 var(--font-mono)",
            color: "var(--text-tertiary)",
          }}
        >
          {version}
        </span>
      ) : null}
    </span>
  );
  if (variant === "stacked") {
    return (
      <span
        style={{
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          gap: size * 0.42,
        }}
      >
        <LogoMark size={size * 1.9} tone={tone} />
        {word}
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.42,
        minWidth: 0,
      }}
    >
      <LogoMark size={size} tone={tone} />
      {word}
    </span>
  );
}
