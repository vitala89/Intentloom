import type { WorkspaceCompositionModel } from "./workspace-composition.js";
import {
  renderWorkspaceView,
  workspaceActionsFor,
} from "./workspace-view-registry.js";

export interface WorkspaceContentProps {
  readonly model: WorkspaceCompositionModel;
}

export function WorkspaceContent({ model }: WorkspaceContentProps) {
  return renderWorkspaceView(
    model.activeView,
    model,
    workspaceActionsFor(model),
  );
}
