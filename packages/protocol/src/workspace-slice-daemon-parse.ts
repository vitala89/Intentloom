import type { RequestId } from "./jsonrpc.js";
import { parseFoundationScaffoldDaemonRequest } from "./foundation-scaffold-daemon-rpc.js";
import type { FoundationScaffoldDaemonRequest } from "./foundation-scaffold-daemon-rpc.js";
import { parseExistingProjectDaemonRequest } from "./existing-project-daemon-rpc.js";
import type { ExistingProjectWorkspacePrepareRequest } from "./existing-project-daemon-rpc.js";
import { parseFeatureIntentDaemonRequest } from "./feature-intent-daemon-rpc.js";
import type { FeatureIntentDaemonRequest } from "./feature-intent-daemon-rpc.js";
import { parseBoundedExecutionDaemonRequest } from "./bounded-execution-daemon-rpc.js";
import type { BoundedExecutionDaemonRequest } from "./bounded-execution-daemon-rpc.js";
import { parseContinuousLoopDaemonRequest } from "./continuous-loop-daemon-rpc.js";
import type { ContinuousLoopDaemonRequest } from "./continuous-loop-daemon-rpc.js";

export type WorkspaceSliceDaemonRequest =
  | ExistingProjectWorkspacePrepareRequest
  | FeatureIntentDaemonRequest
  | BoundedExecutionDaemonRequest
  | ContinuousLoopDaemonRequest
  | FoundationScaffoldDaemonRequest;

export function parseWorkspaceSliceDaemonRequest(
  method: string,
  params: Record<string, unknown>,
  id: RequestId,
): WorkspaceSliceDaemonRequest | null {
  return (
    parseExistingProjectDaemonRequest(method, params, id) ??
    parseFeatureIntentDaemonRequest(method, params, id) ??
    parseBoundedExecutionDaemonRequest(method, params, id) ??
    parseContinuousLoopDaemonRequest(method, params, id) ??
    parseFoundationScaffoldDaemonRequest(method, params, id)
  );
}
