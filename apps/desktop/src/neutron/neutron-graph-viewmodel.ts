import type { NeutronGraphSnapshot } from "@intentloom/protocol";

export { parseNeutronGraphSnapshot } from "./neutron-graph-parse.js";

export function authoritativeGraphSnapshot(viewmodel: {
  readonly responseText: string | null;
  readonly graphSnapshot: NeutronGraphSnapshot | null;
}): NeutronGraphSnapshot | null {
  void viewmodel.responseText;
  return viewmodel.graphSnapshot;
}
