import {
  createBoundedExecutionWorkspaceExecuteRequest,
  createBoundedExecutionWorkspacePrepareRequest,
  type BoundedExecutionViewmodelPayload,
} from "@intentloom/protocol";

type FoundationRequestFn = (
  request: object,
  signal?: AbortSignal,
) => Promise<BoundedExecutionViewmodelPayload>;

export interface BoundedExecutionDesktopCallOptions {
  readonly projectId?: string;
  readonly planApproval?: string;
  readonly grantedApprovals?: readonly string[];
}

function workspaceParams(
  root: string,
  title: string,
  summary: string,
  options?: BoundedExecutionDesktopCallOptions,
) {
  return {
    root,
    title,
    summary,
    ...(options?.projectId !== undefined
      ? { projectId: options.projectId }
      : {}),
    ...(options?.planApproval !== undefined
      ? { planApproval: options.planApproval }
      : {}),
    ...(options?.grantedApprovals !== undefined
      ? { grantedApprovals: options.grantedApprovals }
      : {}),
  };
}

export function boundedExecutionDesktopMethods(
  foundationRequest: FoundationRequestFn,
) {
  return {
    async boundedExecutionWorkspacePrepare(
      root: string,
      title: string,
      summary: string,
      options?: BoundedExecutionDesktopCallOptions,
      signal?: AbortSignal,
    ): Promise<BoundedExecutionViewmodelPayload> {
      return foundationRequest(
        createBoundedExecutionWorkspacePrepareRequest(
          "desktop-bounded-execution-prepare",
          workspaceParams(root, title, summary, options),
        ),
        signal,
      );
    },

    async boundedExecutionWorkspaceExecute(
      root: string,
      title: string,
      summary: string,
      applyRequested: boolean,
      options?: BoundedExecutionDesktopCallOptions,
      signal?: AbortSignal,
    ): Promise<BoundedExecutionViewmodelPayload> {
      return foundationRequest(
        createBoundedExecutionWorkspaceExecuteRequest(
          "desktop-bounded-execution-execute",
          {
            ...workspaceParams(root, title, summary, options),
            applyRequested,
          },
        ),
        signal,
      );
    },
  };
}
