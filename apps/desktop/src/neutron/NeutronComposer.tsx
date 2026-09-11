import { Button } from "../design/components/core/Button.js";
import type { NeutronUiPhase } from "./neutron-session-viewmodel.js";

export interface NeutronComposerProps {
  readonly prompt: string;
  readonly onPromptChange: (value: string) => void;
  readonly onRun: () => void;
  readonly onRunGraph: () => void;
  readonly onCancel: () => void;
  readonly canRun: boolean;
  readonly canRunGraph: boolean;
  readonly canCancel: boolean;
  readonly uiPhase: NeutronUiPhase;
}

export function NeutronComposer({
  prompt,
  onPromptChange,
  onRun,
  onRunGraph,
  onCancel,
  canRun,
  canRunGraph,
  canCancel,
  uiPhase,
}: NeutronComposerProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canRun) onRun();
      }}
    >
      <label className="field-label" htmlFor="neutron-prompt">
        Prompt
      </label>
      <textarea
        id="neutron-prompt"
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        rows={4}
        style={{ width: "100%" }}
        disabled={uiPhase === "submitting" || uiPhase === "cancelling"}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Button type="submit" variant="primary" disabled={!canRun}>
          Run
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!canRunGraph}
          onClick={onRunGraph}
        >
          Run graph
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!canCancel}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
