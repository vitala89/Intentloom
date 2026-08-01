import { useEffect, useId, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { IconButton } from "../core/IconButton.js";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Centred dialog. Focus moves into the dialog on open, is trapped inside it
 * while open, and returns to the invoking element on close. Escape and a
 * backdrop click both close it.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  width = 520,
}: ModalProps) {
  const panel = useRef<HTMLDivElement | null>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const uid = useId();
  const titleId = `modal-title-${uid}`;
  const descId = `modal-desc-${uid}`;

  useEffect(() => {
    if (!isOpen) return;
    restoreTo.current = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel.current)?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      restoreTo.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trap = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !panel.current) return;
    const items = Array.from(
      panel.current.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  };

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-7)",
        background: "var(--scrim)",
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={trap}
        style={{
          width,
          maxWidth: "100%",
          maxHeight: "100%",
          display: "flex",
          flexDirection: "column",
          background: "var(--glass-bg-strong)",
          border: "1px solid var(--glass-border)",
          backdropFilter:
            "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
          WebkitBackdropFilter:
            "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
          borderRadius: "var(--radius-modal)",
          boxShadow: "var(--elevation-3), inset 0 1px 0 var(--hairline-strong)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "var(--space-4)",
            padding: "14px 12px 12px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              id={titleId}
              style={{
                margin: 0,
                font: "var(--heading-md-weight) var(--heading-md-size)/var(--heading-md-line) var(--font-sans)",
                color: "var(--text-primary)",
              }}
            >
              {title}
            </h2>
            {description ? (
              <p
                id={descId}
                style={{
                  margin: "4px 0 0",
                  font: "400 var(--body-sm-size)/var(--body-sm-line) var(--font-sans)",
                  color: "var(--text-secondary)",
                  textWrap: "pretty",
                }}
              >
                {description}
              </p>
            ) : null}
          </div>
          <IconButton icon="x" label="Close" size="sm" onClick={onClose} />
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "var(--space-5)",
          }}
        >
          {children}
        </div>
        {footer ? (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "var(--space-3)",
              padding: "var(--space-4)",
              borderTop: "1px solid var(--border)",
              background: "var(--surface-subtle)",
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
