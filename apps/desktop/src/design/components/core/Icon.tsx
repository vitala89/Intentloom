import type { CSSProperties, SVGProps } from "react";
import { GLYPHS, isGlyphName } from "../../icons/glyphs.js";

export interface IconProps extends Omit<
  SVGProps<SVGSVGElement>,
  "name" | "color" | "style"
> {
  /** Lucide glyph name. Must be present in the vendored glyph set. */
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}

const missingGlyphsWarned = new Set<string>();

/**
 * Icon glyphs come from Lucide (ISC), vendored into `icons/glyphs.ts`.
 *
 * The design system as authored fetched each glyph from a CDN and applied it as
 * a CSS mask. This application makes no external network calls and ships a
 * `default-src 'self'` content security policy, so glyphs are inlined instead.
 *
 * An unknown name renders nothing rather than a placeholder box: the product
 * never shows a synthetic value for something it does not have. Icons are
 * decorative and the accessible name always lives on the control, so an absent
 * glyph degrades the visual only.
 */
export function Icon({
  name,
  size = 16,
  color = "currentColor",
  strokeWidth = 2,
  style,
  ...rest
}: IconProps) {
  if (!isGlyphName(name)) {
    if (import.meta.env.DEV && !missingGlyphsWarned.has(name)) {
      missingGlyphsWarned.add(name);
      console.warn(
        `Icon: no vendored glyph named "${name}". Add it to scripts/desktop/generate-design-icons.mjs and re-run it.`,
      );
    }
    return null;
  }
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
      style={{ display: "inline-block", flex: "0 0 auto", ...style }}
      dangerouslySetInnerHTML={{ __html: GLYPHS[name] }}
    />
  );
}
