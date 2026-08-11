import { useCallback, useState } from "react";
import { Card } from "../design/components/layout/Card.js";
import { Button } from "../design/components/core/Button.js";
import { EmptyState } from "../design/components/states/EmptyState.js";
import { TextInput } from "../design/components/forms/TextInput.js";
import { desktopClient, DesktopBridgeError } from "../desktop-client.js";
import { FoundationWorkshopProgressPanel } from "./FoundationWorkshopProgressPanel.js";
import {
  buildFoundationWorkshopProgress,
  extractWorkshopViewmodel,
  type FoundationClientSurfaceState,
  type FoundationWorkshopProgress,
} from "./foundation-workshop-view-helpers.js";

export interface FoundationWorkshopViewProps {
  readonly resumedWorkshopId?: string | null;
}

export function FoundationWorkshopView({
  resumedWorkshopId,
}: FoundationWorkshopViewProps) {
  const [surfaceState, setSurfaceState] =
    useState<FoundationClientSurfaceState>("empty");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [idea, setIdea] = useState("");
  const [targetRoot, setTargetRoot] = useState("");
  const [resumeId, setResumeId] = useState(resumedWorkshopId ?? "");
  const [progress, setProgress] = useState<FoundationWorkshopProgress | null>(
    null,
  );

  const loadWorkshop = useCallback(async (workshopId: string) => {
    setSurfaceState("loading");
    setErrorMessage(null);
    try {
      const viewmodel = await desktopClient.foundationWorkshopGet(workshopId);
      const parsed = extractWorkshopViewmodel(viewmodel);
      const conflicts =
        await desktopClient.foundationConflictsIdentify(workshopId);
      const conflictPayload = conflicts as { conflicts?: readonly unknown[] };
      setProgress(
        buildFoundationWorkshopProgress(
          parsed,
          conflictPayload.conflicts?.length ?? 0,
        ),
      );
      setSurfaceState("ready");
    } catch (error) {
      setSurfaceState("error");
      setProgress(null);
      setErrorMessage(
        error instanceof DesktopBridgeError
          ? error.message
          : "Could not load the foundation workshop.",
      );
    }
  }, []);

  async function startWorkshop() {
    if (!idea.trim() || !targetRoot.trim()) {
      setErrorMessage("Idea and target root are required to start.");
      setSurfaceState("error");
      return;
    }
    setSurfaceState("loading");
    setErrorMessage(null);
    try {
      const viewmodel = await desktopClient.foundationWorkshopCreate(
        targetRoot.trim(),
        idea.trim(),
      );
      const parsed = extractWorkshopViewmodel(viewmodel);
      setResumeId(parsed.workshop.id);
      setProgress(buildFoundationWorkshopProgress(parsed, 0));
      setSurfaceState("ready");
    } catch (error) {
      setSurfaceState("error");
      setProgress(null);
      setErrorMessage(
        error instanceof DesktopBridgeError
          ? error.message
          : "Could not create the foundation workshop.",
      );
    }
  }

  async function resumeWorkshop() {
    const workshopId = resumeId.trim();
    if (!workshopId) {
      setErrorMessage("Enter a workshop id to resume.");
      setSurfaceState("error");
      return;
    }
    setSurfaceState("resume");
    await loadWorkshop(workshopId);
  }

  async function deleteWorkshop() {
    if (!progress) return;
    setSurfaceState("loading");
    setErrorMessage(null);
    try {
      await desktopClient.foundationWorkshopDelete(progress.workshopId);
      setProgress(null);
      setSurfaceState("deleted");
    } catch (error) {
      setSurfaceState("error");
      setErrorMessage(
        error instanceof DesktopBridgeError
          ? error.message
          : "Could not delete the foundation workshop.",
      );
    }
  }

  if (surfaceState === "deleted") {
    return (
      <EmptyState
        icon="trash-2"
        title="Workshop deleted"
        description="The foundation workshop was removed without writing project files."
        action={
          <Button variant="primary" onClick={() => setSurfaceState("empty")}>
            Start another workshop
          </Button>
        }
      />
    );
  }

  if (surfaceState === "loading" || surfaceState === "resume") {
    return (
      <EmptyState
        icon="loader"
        title={
          surfaceState === "resume"
            ? "Resuming foundation workshop"
            : "Starting foundation workshop"
        }
        description="Reading workshop state from the local daemon."
        compact
      />
    );
  }

  if (surfaceState === "error") {
    return (
      <EmptyState
        icon="circle-alert"
        title="Foundation workshop unavailable"
        description={errorMessage ?? "An unexpected error occurred."}
        action={
          <Button variant="secondary" onClick={() => setSurfaceState("empty")}>
            Back to start
          </Button>
        }
      />
    );
  }

  if (progress) {
    return (
      <FoundationWorkshopProgressPanel
        progress={progress}
        onDelete={() => void deleteWorkshop()}
        onStartNew={() => {
          setProgress(null);
          setSurfaceState("empty");
        }}
      />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5)",
      }}
    >
      <Card variant="raised" className="hero-panel">
        <div className="hero-copy">
          <span className="hero-kicker">Foundation workshop</span>
          <h2>Establish the project foundation</h2>
          <p>
            Capture actors, workflows, quality scenarios, and readiness findings
            before blueprinting or scaffolding.
          </p>
        </div>
      </Card>

      <Card variant="default">
        <div
          style={{
            display: "grid",
            gap: "var(--space-4)",
            maxWidth: 640,
          }}
        >
          <TextInput
            label="Project idea"
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            placeholder="Describe what you want to build"
          />
          <TextInput
            label="Target root path"
            value={targetRoot}
            onChange={(event) => setTargetRoot(event.target.value)}
            placeholder="/path/to/new-project"
          />
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <Button variant="primary" onClick={() => void startWorkshop()}>
              Start foundation workshop
            </Button>
          </div>
        </div>
      </Card>

      <Card variant="default">
        <h3 style={{ marginBottom: "var(--space-3)" }}>
          Resume an existing workshop
        </h3>
        <div
          style={{
            display: "grid",
            gap: "var(--space-3)",
            maxWidth: 640,
          }}
        >
          <TextInput
            label="Workshop id"
            value={resumeId}
            onChange={(event) => setResumeId(event.target.value)}
            placeholder="fnd_..."
          />
          <Button variant="secondary" onClick={() => void resumeWorkshop()}>
            Resume workshop
          </Button>
        </div>
      </Card>
    </div>
  );
}
