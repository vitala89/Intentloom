import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  APPROVED_APPLY_METHOD,
  NEUTRON_MUTATION_REVIEW_GET_METHOD,
  NEUTRON_MUTATION_REVIEW_LIST_METHOD,
  NEUTRON_MUTATION_REVIEW_GET_SCHEMA_URN,
  NEUTRON_MUTATION_REVIEW_LIST_SCHEMA_URN,
} from "@intentloom/protocol";
import { PROTOCOL_VERSION } from "../packages/protocol/src/jsonrpc.js";
import { neutronMutationReviewDesktopMethods } from "../apps/desktop/src/desktop-client-neutron-review.js";
import { composeDesktopClient } from "../apps/desktop/src/desktop-client-facade.js";

const desktopRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../apps/desktop",
);

describe("Neutron mutation review D1 Desktop bridge", () => {
  it("uses dedicated typed commands instead of invoke_neutron_request", async () => {
    const calls: { command: string; request: { method: string } }[] = [];
    const methods = neutronMutationReviewDesktopMethods(
      async (command, request) => {
        calls.push({
          command,
          request: request as { method: string },
        });
        if (command === "list_neutron_mutation_reviews") {
          return {
            jsonrpc: "2.0",
            id: "desktop-neutron-mutation-review-list",
            result: {
              protocolVersion: PROTOCOL_VERSION,
              schemaVersion: NEUTRON_MUTATION_REVIEW_LIST_SCHEMA_URN,
              outcome: "ok",
              reviews: [],
            },
          };
        }
        return {
          jsonrpc: "2.0",
          id: "desktop-neutron-mutation-review-get",
          result: {
            protocolVersion: PROTOCOL_VERSION,
            schemaVersion: NEUTRON_MUTATION_REVIEW_GET_SCHEMA_URN,
            outcome: "proposal-not-found",
          },
        };
      },
    );
    await methods.listNeutronMutationReviews("/project", "s1", "p1");
    await methods.getNeutronMutationReview(
      "/project",
      "s1",
      "p1",
      "proposal-1",
    );
    expect(calls[0]?.command).toBe("list_neutron_mutation_reviews");
    expect(calls[0]?.request.method).toBe(NEUTRON_MUTATION_REVIEW_LIST_METHOD);
    expect(calls[1]?.command).toBe("get_neutron_mutation_review");
    expect(calls[1]?.request.method).toBe(NEUTRON_MUTATION_REVIEW_GET_METHOD);
  });

  it("composes typed review operations onto the Desktop client", () => {
    const client = composeDesktopClient({
      foundationRequest: async () => ({}),
      neutronRequest: async () => {
        throw new Error("generic neutronRequest must not handle review");
      },
    });
    expect(typeof client.listNeutronMutationReviews).toBe("function");
    expect(typeof client.getNeutronMutationReview).toBe("function");
  });

  it("does not route Neutron review through legacy Apply", () => {
    const source = readFileSync(
      join(desktopRoot, "src/desktop-client-neutron-review.ts"),
      "utf8",
    );
    expect(source).not.toContain("ApprovedApplyModal");
    expect(source).not.toContain(APPROVED_APPLY_METHOD);
    expect(source).not.toContain("approveAndApply");
    expect(source).not.toContain("applyApprovedNeutronGraphMutation");
    expect(source).not.toContain("invoke_neutron_request");
    const allowlist = readFileSync(
      join(desktopRoot, "src-tauri/src/method_allowlist.rs"),
      "utf8",
    );
    expect(allowlist).toContain(
      'method == "intentloom.neutron.mutation.review.list.v1"',
    );
    expect(allowlist).toContain(
      'method == "intentloom.neutron.mutation.review.get.v1"',
    );
    const neutronMethods = allowlist.slice(
      allowlist.indexOf("pub fn is_neutron_method"),
      allowlist.indexOf("pub fn is_neutron_mutation_review_list_method"),
    );
    expect(neutronMethods).not.toContain("mutation.review");
    expect(neutronMethods).not.toContain("approvedApply");
  });
});
