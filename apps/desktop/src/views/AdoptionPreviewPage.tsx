import { useCallback, useEffect, useState } from "react";
import {
  supportedAdoptionDecisionKinds,
  type AdoptionDecisionKind,
  type ExistingProjectAdoptionDecisionViewModel,
  type ExistingProjectAdoptionPlanViewModel,
  type ExistingProjectAdoptionPreparedPlan,
  type ExistingProjectAdoptionRevalidateViewModel,
  type ExistingProjectAdoptionApproveViewModel,
  type ExistingProjectAdoptionApplyViewModel,
} from "@intentloom/protocol";
import { Button } from "../design/components/core/Button.js";
import { EmptyState } from "../design/components/states/EmptyState.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import { desktopClient } from "../desktop-client.js";
import {
  loadAdoptionPreview,
  type AdoptionPreviewSurfaceState,
} from "./adoption-preview-controller.js";
import {
  clearStaleAdoptionDecisions,
  selectedDecisionsFromMap,
  validateAdoptionDecisions,
} from "./adoption-decision-controller.js";
import {
  approveAdoptionPlan,
  prepareAdoptionPlan,
  revalidateAdoptionPlan,
} from "./adoption-prepared-plan-controller.js";
import { AdoptionPreparedPlanPanel } from "./AdoptionPreparedPlanPanel.js";
import { AdoptionApplyPanel } from "./AdoptionApplyPanel.js";
import { applyApprovedAdoptionPlan } from "./adoption-apply-controller.js";
import { renderAdoptionDecisionSummary } from "./adoption-decision-presentation.js";
import {
  adoptionPreviewHasManualDecisions,
  groupAdoptionPlanItems,
} from "./adoption-preview-grouping.js";
import { ADOPTION_PREVIEW_STATUS_COPY } from "./adoption-preview-status-copy.js";
import { AdoptionDecisionNotice } from "./AdoptionDecisionNotice.js";
import { AdoptionDecisionPanel } from "./AdoptionDecisionPanel.js";
import { AdoptionDiagnostics } from "./AdoptionDiagnostics.js";
import { AdoptionPlanGroup } from "./AdoptionPlanGroup.js";
import { AdoptionProjectSummary } from "./AdoptionProjectSummary.js";

export interface AdoptionPreviewPageProps {
  readonly root: string | null;
  readonly onSelectProject: () => void;
}

export function AdoptionPreviewPage({
  root,
  onSelectProject,
}: AdoptionPreviewPageProps) {
  const [status, setStatus] = useState<AdoptionPreviewSurfaceState>("idle");
  const [plan, setPlan] = useState<ExistingProjectAdoptionPlanViewModel | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selections, setSelections] = useState<
    ReadonlyMap<string, AdoptionDecisionKind>
  >(new Map());
  const [decisionResult, setDecisionResult] =
    useState<ExistingProjectAdoptionDecisionViewModel | null>(null);
  const [preparedPlan, setPreparedPlan] =
    useState<ExistingProjectAdoptionPreparedPlan | null>(null);
  const [revalidation, setRevalidation] =
    useState<ExistingProjectAdoptionRevalidateViewModel | null>(null);
  const [approval, setApproval] =
    useState<ExistingProjectAdoptionApproveViewModel | null>(null);
  const [applyResult, setApplyResult] =
    useState<ExistingProjectAdoptionApplyViewModel | null>(null);
  const [applying, setApplying] = useState(false);

  const resetDecisions = useCallback(() => {
    setSelections(new Map());
    setDecisionResult(null);
    setPreparedPlan(null);
    setRevalidation(null);
    setApproval(null);
    setApplyResult(null);
    setApplying(false);
  }, []);

  const loadPreview = useCallback(async () => {
    setStatus("loading");
    resetDecisions();
    const result = await loadAdoptionPreview({
      client: desktopClient,
      root,
    });
    setPlan(result.plan);
    setErrorMessage(result.errorMessage);
    setStatus(result.status);
  }, [resetDecisions, root]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  useEffect(() => {
    if (
      clearStaleAdoptionDecisions(
        root,
        plan?.root ?? null,
        plan?.previewIdentity ?? null,
        decisionResult?.previewIdentity ?? null,
      )
    ) {
      resetDecisions();
    }
  }, [
    decisionResult?.previewIdentity,
    plan?.previewIdentity,
    plan?.root,
    resetDecisions,
    root,
  ]);

  const selectDecision = useCallback(
    async (path: string, kind: AdoptionDecisionKind) => {
      if (!plan) return;
      const next = new Map(selections);
      next.set(path, kind);
      setSelections(next);
      const validated = await validateAdoptionDecisions({
        client: desktopClient,
        root,
        previewIdentity: plan.previewIdentity,
        projectId: plan.projectId,
        selections: next,
      });
      if (validated.status === "stale") {
        resetDecisions();
        setStatus("stale");
        setErrorMessage(validated.errorMessage);
        return;
      }
      if (validated.status === "disconnected" || validated.status === "error") {
        setDecisionResult(null);
        setErrorMessage(validated.errorMessage);
        return;
      }
      setDecisionResult(validated.result);
    },
    [plan, resetDecisions, root, selections],
  );

  const preparePlan = useCallback(async () => {
    if (!plan) return;
    const prepared = await prepareAdoptionPlan({
      client: desktopClient,
      root,
      previewIdentity: plan.previewIdentity,
      projectId: plan.projectId,
      decisions: selectedDecisionsFromMap(selections),
    });
    setPreparedPlan(prepared.result?.plan ?? null);
    setRevalidation(null);
    setApproval(null);
    setApplyResult(null);
    if (prepared.errorMessage) setErrorMessage(prepared.errorMessage);
  }, [plan, root, selections]);

  const revalidatePlan = useCallback(async () => {
    const checked = await revalidateAdoptionPlan({
      client: desktopClient,
      root,
      plan: preparedPlan,
    });
    setRevalidation(checked.result);
    setApproval(null);
    setApplyResult(null);
    if (checked.errorMessage) setErrorMessage(checked.errorMessage);
  }, [preparedPlan, root]);

  const approvePlan = useCallback(async () => {
    const approved = await approveAdoptionPlan({
      client: desktopClient,
      root,
      plan: preparedPlan,
    });
    setApproval(approved.result);
    setApplyResult(null);
    if (approved.errorMessage) setErrorMessage(approved.errorMessage);
  }, [preparedPlan, root]);

  const applyPlan = useCallback(async () => {
    if (applying) return;
    setApplying(true);
    const applied = await applyApprovedAdoptionPlan({
      client: desktopClient,
      root,
      plan: preparedPlan,
      approval: approval?.approval ?? null,
    });
    setApplyResult(applied.result);
    setApplying(false);
    if (applied.errorMessage) setErrorMessage(applied.errorMessage);
  }, [applying, approval, preparedPlan, root]);

  if (status === "idle" || status === "loading" || !root) {
    const copy = ADOPTION_PREVIEW_STATUS_COPY.idle;
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
    const copy = ADOPTION_PREVIEW_STATUS_COPY[status];
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
        description={
          errorMessage ?? ADOPTION_PREVIEW_STATUS_COPY.error.description
        }
        title={ADOPTION_PREVIEW_STATUS_COPY.error.title}
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
  const decisionsPrepared = decisionResult?.decisionsPrepared ?? 0;

  return (
    <section aria-labelledby="adoption-preview-heading" className="view-panel">
      <header className="view-header">
        <div>
          <span className="hero-kicker">Intentloom setup</span>
          <h1 id="adoption-preview-heading">Adoption preview</h1>
          <p className="view-lead">
            Review what Intentloom would add or map, then select supported
            decisions. Decisions are not applied, saved, or written to the
            project.
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
      <AdoptionPreparedPlanPanel
        approval={approval}
        canPrepare={status === "ready" || status === "empty"}
        onApprove={() => void approvePlan()}
        onPrepare={() => void preparePlan()}
        onRevalidate={() => void revalidatePlan()}
        plan={preparedPlan}
        revalidation={revalidation}
      />
      {approval?.status === "approved" ? (
        <AdoptionApplyPanel
          applying={applying}
          approval={approval.approval}
          onApply={() => void applyPlan()}
          plan={preparedPlan}
          result={applyResult}
          revalidationStatus={revalidation?.status ?? null}
        />
      ) : null}
      <p aria-live="polite">
        {renderAdoptionDecisionSummary({
          decisionsPrepared,
          changesApplied: 0,
        })
          .split("\n")
          .join(" · ")}
      </p>
      {status === "empty" ? (
        <EmptyState
          compact
          description="The typed plan reported no create, map, skip, or decision items."
          title="No adoption actions"
        />
      ) : null}
      {adoptionPreviewHasManualDecisions(plan)
        ? decisions.map((item, index) =>
            supportedAdoptionDecisionKinds(item).length > 0 ? (
              <AdoptionDecisionPanel
                index={index}
                item={item}
                key={`${item.path}:${item.action}`}
                onSelect={(path, kind) => void selectDecision(path, kind)}
                result={decisionResult}
                selectedKind={selections.get(item.path) ?? null}
              />
            ) : (
              <AdoptionDecisionNotice
                index={index}
                item={item}
                key={`${item.path}:${item.action}`}
              />
            ),
          )
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
