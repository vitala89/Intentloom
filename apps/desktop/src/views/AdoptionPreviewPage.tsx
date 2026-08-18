import { useCallback, useEffect, useState } from "react";
import type { ExistingProjectAdoptionPlanViewModel } from "@intentloom/protocol";
import { Button } from "../design/components/core/Button.js";
import { EmptyState } from "../design/components/states/EmptyState.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import { desktopClient } from "../desktop-client.js";
import {
  loadAdoptionPreview,
  type AdoptionPreviewSurfaceState,
} from "./adoption-preview-controller.js";
import {
  adoptionPreviewHasManualDecisions,
  groupAdoptionPlanItems,
} from "./adoption-preview-grouping.js";
import { AdoptionDecisionNotice } from "./AdoptionDecisionNotice.js";
import { AdoptionDiagnostics } from "./AdoptionDiagnostics.js";
import { AdoptionPlanGroup } from "./AdoptionPlanGroup.js";
import { AdoptionProjectSummary } from "./AdoptionProjectSummary.js";

export interface AdoptionPreviewPageProps {
  readonly root: string | null;
  readonly onSelectProject: () => void;
}

const STATUS_COPY: Record<
  Exclude<AdoptionPreviewSurfaceState, "ready" | "loading" | "empty">,
  { title: string; description: string; action: string }
> = {
  idle: {
    title: "Select a project",
    description:
      "Choose a local project root before requesting a read-only adoption preview.",
    action: "Select local project",
  },
  stale: {
    title: "Project root changed",
    description:
      "The preview no longer matches the selected canonical root. Load it again.",
    action: "Retry preview",
  },
  unsupported: {
    title: "Adoption preview unsupported",
    description:
      "This daemon cannot serve the existing-project adoption plan contract.",
    action: "Retry preview",
  },
  disconnected: {
    title: "Daemon unavailable",
    description:
      "The local daemon disconnected before the preview could load. Retry without changing the project.",
    action: "Retry preview",
  },
  "authentication-failure": {
    title: "Authentication failed",
    description:
      "The daemon rejected the preview request. Reconnect and try again. No project files were changed.",
    action: "Retry preview",
  },
  error: {
    title: "Adoption preview unavailable",
    description:
      "The read-only plan could not be loaded. Retry without applying changes.",
    action: "Retry preview",
  },
};

export function AdoptionPreviewPage({
  root,
  onSelectProject,
}: AdoptionPreviewPageProps) {
  const [status, setStatus] = useState<AdoptionPreviewSurfaceState>("idle");
  const [plan, setPlan] = useState<ExistingProjectAdoptionPlanViewModel | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    setStatus("loading");
    const result = await loadAdoptionPreview({
      client: desktopClient,
      root,
    });
    setPlan(result.plan);
    setErrorMessage(result.errorMessage);
    setStatus(result.status);
  }, [root]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  if (status === "idle" || status === "loading" || !root) {
    const copy = STATUS_COPY.idle;
    return (
      <EmptyState
        description={
          status === "loading"
            ? "Loading a read-only adoption preview. No project files will be changed."
            : copy.description
        }
        title={status === "loading" ? "Loading preview" : copy.title}
        action={
          <Button
            disabled={status === "loading"}
            id="adoption-preview-primary-action"
            onClick={root ? () => void loadPreview() : onSelectProject}
            variant="primary"
          >
            {status === "loading" ? "Loading…" : copy.action}
          </Button>
        }
      />
    );
  }

  if (status !== "ready" && status !== "empty" && status !== "stale") {
    const copy = STATUS_COPY[status];
    return (
      <EmptyState
        description={errorMessage ?? copy.description}
        title={copy.title}
        action={
          <Button
            id="adoption-preview-primary-action"
            onClick={() => void loadPreview()}
            variant="primary"
          >
            {copy.action}
          </Button>
        }
      />
    );
  }

  if (!plan) {
    return (
      <EmptyState
        description={errorMessage ?? STATUS_COPY.error.description}
        title={STATUS_COPY.error.title}
        action={
          <Button
            id="adoption-preview-primary-action"
            onClick={() => void loadPreview()}
            variant="primary"
          >
            Retry preview
          </Button>
        }
      />
    );
  }

  const decisions = plan.items.filter((item) => item.manualDecisionRequired);
  const remainingGroups = groupAdoptionPlanItems(plan.items).filter(
    (group) => group.id !== "requires-decision",
  );

  return (
    <section aria-labelledby="adoption-preview-heading" className="view-panel">
      <header className="view-header">
        <div>
          <span className="hero-kicker">Intentloom setup</span>
          <h1 id="adoption-preview-heading">Adoption preview</h1>
          <p className="view-lead">
            Review what Intentloom would add or map. This surface is read-only
            and does not apply, save, or resolve mapping choices.
          </p>
        </div>
        <StatusChip
          label={status === "empty" ? "No adoption actions" : status}
          tone={status === "stale" ? "warning" : "info"}
        />
      </header>
      <div className="view-actions">
        <Button
          id="adoption-preview-primary-action"
          onClick={() => void loadPreview()}
          variant="secondary"
        >
          Retry preview
        </Button>
      </div>
      <AdoptionProjectSummary plan={plan} selectedRoot={root} />
      {status === "empty" ? (
        <EmptyState
          compact
          description="The typed plan reported no create, map, skip, or decision items."
          title="No adoption actions"
        />
      ) : null}
      {adoptionPreviewHasManualDecisions(plan)
        ? decisions.map((item, index) => (
            <AdoptionDecisionNotice
              index={index}
              item={item}
              key={`${item.path}:${item.action}`}
            />
          ))
        : null}
      {remainingGroups.map((group) => (
        <AdoptionPlanGroup
          heading={group.heading}
          id={group.id}
          items={group.items}
          key={group.id}
        />
      ))}
      <AdoptionDiagnostics
        diagnostics={plan.diagnostics}
        nextActions={plan.nextActions}
      />
    </section>
  );
}
