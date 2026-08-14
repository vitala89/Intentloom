import {
  createContinuousLoopWorkspaceExecuteRequest,
  createContinuousLoopWorkspacePrepareRequest,
  type ContinuousLoopChangeKind,
  type ContinuousLoopSnapshot,
  type ContinuousLoopViewmodelPayload,
} from "@intentloom/protocol";

type FoundationRequestFn = (
  request: object,
  signal?: AbortSignal,
) => Promise<ContinuousLoopViewmodelPayload>;

export interface ContinuousLoopDesktopCallOptions {
  readonly projectId?: string;
  readonly changeKind?: ContinuousLoopChangeKind;
  readonly memoryContent?: string;
  readonly grantedApprovals?: readonly string[];
}

function workspaceParams(
  root: string,
  previous: ContinuousLoopSnapshot,
  current: ContinuousLoopSnapshot,
  options?: ContinuousLoopDesktopCallOptions,
) {
  return {
    root,
    previous,
    current,
    ...(options?.projectId !== undefined
      ? { projectId: options.projectId }
      : {}),
    ...(options?.changeKind !== undefined
      ? { changeKind: options.changeKind }
      : {}),
    ...(options?.memoryContent !== undefined
      ? { memoryContent: options.memoryContent }
      : {}),
    ...(options?.grantedApprovals !== undefined
      ? { grantedApprovals: options.grantedApprovals }
      : {}),
  };
}

export function continuousLoopDesktopMethods(
  foundationRequest: FoundationRequestFn,
) {
  return {
    async continuousLoopWorkspacePrepare(
      root: string,
      previous: ContinuousLoopSnapshot,
      current: ContinuousLoopSnapshot,
      options?: ContinuousLoopDesktopCallOptions,
      signal?: AbortSignal,
    ): Promise<ContinuousLoopViewmodelPayload> {
      return foundationRequest(
        createContinuousLoopWorkspacePrepareRequest(
          "desktop-continuous-loop-prepare",
          workspaceParams(root, previous, current, options),
        ),
        signal,
      );
    },

    async continuousLoopWorkspaceExecute(
      root: string,
      previous: ContinuousLoopSnapshot,
      current: ContinuousLoopSnapshot,
      applyRequested: boolean,
      options?: ContinuousLoopDesktopCallOptions,
      signal?: AbortSignal,
    ): Promise<ContinuousLoopViewmodelPayload> {
      return foundationRequest(
        createContinuousLoopWorkspaceExecuteRequest(
          "desktop-continuous-loop-execute",
          {
            ...workspaceParams(root, previous, current, options),
            applyRequested,
          },
        ),
        signal,
      );
    },
  };
}
