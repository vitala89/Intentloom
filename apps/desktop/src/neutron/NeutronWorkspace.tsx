import { Button } from "../design/components/core/Button.js";
import { EmptyState } from "../design/components/states/EmptyState.js";
import { Card } from "../design/components/layout/Card.js";
import { NeutronActivityPanel } from "./NeutronActivityPanel.js";
import { NeutronComposer } from "./NeutronComposer.js";
import { NeutronResult } from "./NeutronResult.js";
import { NeutronSessionHeader } from "./NeutronSessionHeader.js";
import { NeutronTaskGraphPanel } from "./NeutronTaskGraphPanel.js";
import { authoritativeGraphSnapshot } from "./neutron-graph-viewmodel.js";
import { neutronSurfaceKind } from "./neutron-session-viewmodel.js";
import { useNeutronSession } from "./use-neutron-session.js";

export interface NeutronWorkspaceProps {
  readonly root: string | null;
  readonly onSelectProject: () => void;
}

export function NeutronWorkspace({
  root,
  onSelectProject,
}: NeutronWorkspaceProps) {
  const session = useNeutronSession(root);
  if (root === null) {
    return (
      <EmptyState
        title="Neutron"
        description="Select a project root to open a read-only Neutron session."
        action={
          <Button variant="primary" onClick={onSelectProject}>
            Select project
          </Button>
        }
      />
    );
  }
  const surface = neutronSurfaceKind({
    viewmodel: session.viewmodel,
    infrastructureError: session.infrastructureError,
  });
  const canCancel =
    session.viewmodel !== null &&
    (session.uiPhase === "submitting" ||
      session.viewmodel.session.state === "created" ||
      session.viewmodel.session.state === "discussing" ||
      session.viewmodel.session.state === "inspecting" ||
      session.viewmodel.session.state === "planning");
  return (
    <section aria-labelledby="neutron-heading" className="view-panel">
      <NeutronSessionHeader
        root={root}
        uiPhase={session.uiPhase}
        viewmodel={session.viewmodel}
      />
      <Card title="Session start">
        <Button
          variant="secondary"
          onClick={() => void session.createSession()}
          disabled={session.uiPhase !== "idle"}
        >
          Create session
        </Button>
      </Card>
      {session.viewmodel !== null ? (
        <NeutronTaskGraphPanel
          snapshot={authoritativeGraphSnapshot({
            responseText: session.viewmodel.responseText,
            graphSnapshot: session.viewmodel.graphSnapshot,
          })}
        />
      ) : null}
      <NeutronResult
        infrastructureError={session.infrastructureError}
        surface={surface}
        viewmodel={session.viewmodel}
      />
      <NeutronActivityPanel viewmodel={session.viewmodel} />
      <NeutronComposer
        canCancel={canCancel}
        canRun={
          session.viewmodel !== null &&
          session.prompt.trim().length > 0 &&
          session.uiPhase === "idle" &&
          session.viewmodel.session.state !== "cancelled" &&
          session.viewmodel.session.state !== "completed" &&
          session.viewmodel.session.state !== "failed" &&
          session.viewmodel.session.state !== "timed-out"
        }
        canRunGraph={
          session.viewmodel !== null &&
          session.prompt.trim().length > 0 &&
          session.uiPhase === "idle" &&
          session.viewmodel.session.state !== "cancelled"
        }
        onCancel={() => void session.cancelSession()}
        onPromptChange={session.setPrompt}
        onRun={() => void session.runTurn()}
        onRunGraph={() => void session.runGraph()}
        prompt={session.prompt}
        uiPhase={session.uiPhase}
      />
    </section>
  );
}
