import { useId } from "react";
import type { SVGProps } from "react";

const D =
  "M13.917,-7.111 A8.2,8.2 0 1,1 13.917,7.111 A27.95,27.95 0 0,1 -13.917,7.111 A8.2,8.2 0 1,1 -13.917,-7.111 A27.95,27.95 0 0,1 13.917,-7.111 Z";
const D_SMALL =
  "M12.727,-7.727 A8.6,8.6 0 1,1 12.727,7.727 A21.63,21.63 0 0,1 -12.727,7.727 A8.6,8.6 0 1,1 -12.727,-7.727 A21.63,21.63 0 0,1 12.727,-7.727 Z";
const C = 4.808,
  MR = 3.65;

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

/** The Intentloom mark: two woven loops on the diagonals. Vector, so it is crisp at any size. */
export function LogoMark({
  size = 24,
  tone = "gradient",
  title = "Intentloom",
  ...rest
}: LogoMarkProps) {
  const uid = useId().replace(/:/g, "");
  const stroke = tone === "gradient" ? `url(#g${uid})` : "currentColor";
  // Below 22px the weave breaks and the fine counters close up - switch to the simplified cut.
  const small = size < 22;
  return (
    <svg
      viewBox="0 0 64 64"
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
            x1="58"
            y1="8"
            x2="8"
            y2="58"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#4E97E6" />
            <stop offset=".34" stopColor="#3A6FE8" />
            <stop offset=".7" stopColor="#4A55F4" />
            <stop offset="1" stopColor="#5B45FA" />
          </linearGradient>
        </defs>
      ) : null}
      {small ? (
        <g
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path transform="translate(32 32) rotate(-45)" d={D_SMALL} />
          <path transform="translate(32 32) rotate(45)" d={D_SMALL} />
        </g>
      ) : (
        <>
          <defs>
            <mask id={`ma${uid}`}>
              <rect width="64" height="64" fill="#fff" />
              <circle cx="32" cy={32 - C} r={MR} fill="#000" />
              <circle cx="32" cy={32 + C} r={MR} fill="#000" />
            </mask>
            <mask id={`mb${uid}`}>
              <rect width="64" height="64" fill="#fff" />
              <circle cx={32 - C} cy="32" r={MR} fill="#000" />
              <circle cx={32 + C} cy="32" r={MR} fill="#000" />
            </mask>
          </defs>
          <g
            fill="none"
            stroke={stroke}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <g mask={`url(#mb${uid})`}>
              <path transform="translate(32 32) rotate(-45)" d={D} />
            </g>
            <g mask={`url(#ma${uid})`}>
              <path transform="translate(32 32) rotate(45)" d={D} />
            </g>
          </g>
        </>
      )}
    </svg>
  );
}

export interface LogoProps {
  variant?: "lockup" | "mark" | "stacked";
  /** Mark box in px; the wordmark scales from it. */
  size?: number;
  tone?: "gradient" | "mono";
  showVersion?: boolean;
  version?: string;
}

/** Mark + wordmark. `variant="mark"` for the symbol alone, `"stacked"` for the vertical lockup. */
export function Logo({
  variant = "lockup",
  size = 24,
  tone = "gradient",
  showVersion,
  version = "v0.6.0-beta.1",
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
      {showVersion ? (
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
