import type { NeutronSessionViewmodel } from "@intentloom/protocol";
import { NeutronContextSources } from "./NeutronContextSources.js";
import { NeutronContextSummary } from "./NeutronContextSummary.js";
import { NeutronToolActivity } from "./NeutronToolActivity.js";
import { authoritativeToolActivity } from "./neutron-activity-viewmodel.js";

export interface NeutronActivityPanelProps {
  readonly viewmodel: NeutronSessionViewmodel | null;
}

export function NeutronActivityPanel({ viewmodel }: NeutronActivityPanelProps) {
  if (
    viewmodel === null ||
    (viewmodel.contextSummary === null && viewmodel.toolActivity.length === 0)
  ) {
    return null;
  }
  return (
    <section aria-label="Turn context and tool activity">
      {viewmodel.contextSummary !== null ? (
        <>
          <NeutronContextSummary summary={viewmodel.contextSummary} />
          <NeutronContextSources sources={viewmodel.contextSummary.sources} />
        </>
      ) : null}
      <NeutronToolActivity activity={authoritativeToolActivity(viewmodel)} />
    </section>
  );
}
