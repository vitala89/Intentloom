import { useEffect, useRef, useState } from "react";
import { Icon } from "../core/Icon.js";

export interface CopyButtonProps {
  /** The complete, untruncated value to place on the clipboard. */
  value: string;
  label?: string | undefined;
  size?: "sm" | "md" | undefined;
  /** Show the text label next to the glyph. */
  withLabel?: boolean | undefined;
}

/** Copies a value and confirms in place. Every truncated path or hash must offer one. */
export function CopyButton({
  value,
  label = "Copy",
  size = "sm",
  withLabel,
}: CopyButtonProps) {
  const [done, setDone] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // The reset timer must not outlive the button: an unmounted component that
  // still holds a pending timer updates state that no longer exists.
  useEffect(() => {
    return () => {
      if (resetTimer.current !== undefined) clearTimeout(resetTimer.current);
    };
  }, []);

  const copy = () => {
    // No clipboard, no confirmation. Reporting a copy that did not happen is
    // worse than reporting nothing, so the state is left untouched.
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(String(value)).then(
      () => {
        setDone(true);
        if (resetTimer.current !== undefined) clearTimeout(resetTimer.current);
        resetTimer.current = setTimeout(() => setDone(false), 1200);
      },
      () => {
        // Write rejected (permission, insecure context, focus loss). Stay
        // silent and do not claim success.
      },
    );
  };

  return (
    <button
      type="button"
      aria-label={done ? "Copied" : label}
      title={done ? "Copied" : label}
      onClick={copy}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        minWidth: 24,
        minHeight: 24,
        height: size === "sm" ? 24 : 28,
        padding: withLabel ? "0 8px" : 0,
        justifyContent: "center",
        background: "transparent",
        border: withLabel ? "1px solid var(--border)" : 0,
        borderRadius: "var(--radius-control)",
        cursor: "pointer",
        color: done ? "var(--status-healthy-fg)" : "var(--text-tertiary)",
        font: "var(--label-sm-weight) var(--label-sm-size)/1 var(--font-sans)",
        transition: "color var(--motion-control) var(--ease-standard)",
      }}
    >
      <Icon name={done ? "check" : "copy"} size={13} />
      {withLabel ? (done ? "Copied" : label) : null}
    </button>
  );
}
