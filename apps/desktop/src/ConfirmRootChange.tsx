import { useEffect } from "react";
import { Modal } from "./design/components/overlays/Modal.js";
import { Button } from "./design/components/core/Button.js";

export function ConfirmRootChange({
  currentRoot,
  loadedViews,
  onConfirm,
  onCancel,
  triggerRef,
}: {
  currentRoot: string;
  loadedViews: readonly string[];
  onConfirm: () => void;
  onCancel: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  // Return focus to trigger on unmount
  useEffect(() => {
    return () => {
      triggerRef.current?.focus();
    };
  }, [triggerRef]);

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title="Change project root?"
      description="Switching the root will clear all loaded read-only data for the current project."
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Keep current
          </Button>

          <Button variant="primary" onClick={onConfirm}>
            Change project
          </Button>
        </>
      }
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        <div>
          <span
            className="eyebrow"
            style={{
              display: "block",
              marginBottom: "var(--space-1)",
              font: "var(--caption-weight) var(--caption-size)/1 var(--font-sans)",
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Current root
          </span>
          <code
            style={{
              display: "block",
              padding: "var(--space-2) var(--space-3)",
              background: "var(--surface-subtle)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-control)",
              font: "400 var(--body-sm-size)/1 var(--font-mono)",
              color: "var(--text-primary)",
              wordBreak: "break-all",
            }}
          >
            {currentRoot}
          </code>
        </div>

        {loadedViews.length > 0 ? (
          <div>
            <span
              className="eyebrow"
              style={{
                display: "block",
                marginBottom: "var(--space-2)",
                font: "var(--caption-weight) var(--caption-size)/1 var(--font-sans)",
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Data that will be cleared
            </span>
            <ul
              style={{
                margin: 0,
                paddingLeft: "var(--space-4)",
                font: "400 var(--body-sm-size)/1.5 var(--font-sans)",
                color: "var(--text-secondary)",
              }}
            >
              {loadedViews.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
