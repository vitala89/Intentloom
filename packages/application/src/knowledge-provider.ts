import type {
  KnowledgeProviderAdapter,
  KnowledgeProviderQuery,
  KnowledgeProviderQueryResult,
  ExtensionLockfile,
} from "@intentloom/protocol";
import {
  validateKnowledgeProviderQuery,
  validateKnowledgeProviderQueryResult,
  verifyKnowledgeProviderCapability,
} from "@intentloom/validator";

export interface QueryKnowledgeProviderOptions {
  query: KnowledgeProviderQuery;
  adapter?: KnowledgeProviderAdapter;
  extensionLock?: ExtensionLockfile;
  extensionId?: string;
}

export async function queryKnowledgeProvider(
  options: QueryKnowledgeProviderOptions,
): Promise<KnowledgeProviderQueryResult> {
  const query = validateKnowledgeProviderQuery(options.query);

  if (!options.adapter) {
    return {
      status: "provider_unavailable",
      nodes: [],
      edges: [],
      diagnostics: ["No knowledge-provider adapter provided or configured."],
    };
  }

  if (options.extensionLock && options.extensionId) {
    const lockEntry = options.extensionLock.extensions?.[options.extensionId];
    if (!lockEntry || lockEntry.category !== "knowledge-provider") {
      return {
        status: "provider_unavailable",
        nodes: [],
        edges: [],
        diagnostics: [
          `Extension '${options.extensionId}' is not a locked knowledge-provider.`,
        ],
      };
    }
    const hasCapability = verifyKnowledgeProviderCapability(
      query,
      lockEntry.grantedCapabilities,
    );
    if (!hasCapability) {
      return {
        status: "capability_denied",
        nodes: [],
        edges: [],
        diagnostics: [
          `Target path '${query.targetPath}' exceeds granted filesystem read capabilities for extension '${options.extensionId}'.`,
        ],
      };
    }
  }

  try {
    const rawResult = await options.adapter.query(query);
    return validateKnowledgeProviderQueryResult(rawResult);
  } catch (error) {
    return {
      status: "query_failed",
      nodes: [],
      edges: [],
      diagnostics: [error instanceof Error ? error.message : String(error)],
    };
  }
}
