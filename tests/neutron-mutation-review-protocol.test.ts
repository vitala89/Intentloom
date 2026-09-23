import { describe, expect, it } from "vitest";
import {
  NEUTRON_MUTATION_REVIEW_GET_METHOD,
  NEUTRON_MUTATION_REVIEW_LIST_METHOD,
  createNeutronMutationReviewGetRequest,
  createNeutronMutationReviewListRequest,
  parseDaemonRequest,
  parseNeutronMutationReviewDaemonRequest,
  parseNeutronMutationReviewGetResponse,
} from "@intentloom/protocol";
import { PROTOCOL_VERSION } from "../packages/protocol/src/jsonrpc.js";
import { NEUTRON_MUTATION_REVIEW_GET_SCHEMA_URN } from "../packages/protocol/src/neutron-mutation-review-view.js";
import { NEUTRON_READ_ONLY_TOOLS } from "../packages/protocol/src/neutron-runtime.js";

describe("Neutron mutation review D1 protocol", () => {
  it("parses named list and get methods", () => {
    const list = parseDaemonRequest(
      createNeutronMutationReviewListRequest(1, "/tmp/p", "s1", "p1", "g1"),
    );
    expect(list.method).toBe(NEUTRON_MUTATION_REVIEW_LIST_METHOD);
    const get = parseDaemonRequest(
      createNeutronMutationReviewGetRequest(
        2,
        "/tmp/p",
        "s1",
        "p1",
        "proposal-1",
        "g1",
      ),
    );
    expect(get.method).toBe(NEUTRON_MUTATION_REVIEW_GET_METHOD);
  });

  it("rejects unknown and approval-like request fields", () => {
    expect(() =>
      parseNeutronMutationReviewDaemonRequest(
        NEUTRON_MUTATION_REVIEW_GET_METHOD,
        {
          protocolVersion: PROTOCOL_VERSION,
          root: "/tmp/p",
          sessionId: "s1",
          projectId: "p1",
          proposalId: "proposal-1",
          approvalToken: "approved:abc",
        },
        1,
      ),
    ).toThrow(/must not include approvalToken/);
    expect(() =>
      parseNeutronMutationReviewDaemonRequest(
        NEUTRON_MUTATION_REVIEW_GET_METHOD,
        {
          protocolVersion: PROTOCOL_VERSION,
          root: "/tmp/p",
          sessionId: "s1",
          projectId: "p1",
          proposalId: "proposal-1",
          files: [{ path: "src/a.ts", content: "nope" }],
        },
        1,
      ),
    ).toThrow(/must not include files/);
    expect(() =>
      parseNeutronMutationReviewDaemonRequest(
        NEUTRON_MUTATION_REVIEW_LIST_METHOD,
        {
          protocolVersion: PROTOCOL_VERSION,
          root: "/tmp/p",
          sessionId: "s1",
          projectId: "p1",
          proposalId: "should-not-be-here",
        },
        1,
      ),
    ).toThrow(/must not include proposalId/);
  });

  it("requires an explicit proposalId on get", () => {
    expect(() =>
      parseNeutronMutationReviewDaemonRequest(
        NEUTRON_MUTATION_REVIEW_GET_METHOD,
        {
          protocolVersion: PROTOCOL_VERSION,
          root: "/tmp/p",
          sessionId: "s1",
          projectId: "p1",
        },
        1,
      ),
    ).toThrow(/proposalId must be a non-empty string/);
  });

  it("rejects a failed get payload that still includes review bytes", () => {
    expect(() =>
      parseNeutronMutationReviewGetResponse({
        jsonrpc: "2.0",
        id: 1,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          schemaVersion: NEUTRON_MUTATION_REVIEW_GET_SCHEMA_URN,
          outcome: "payload-mismatch",
          review: { proposalId: "x" },
        },
      }),
    ).toThrow(/must not include review/);
  });

  it("keeps N4 at seven read-only tools", () => {
    expect(NEUTRON_READ_ONLY_TOOLS).toHaveLength(7);
    expect(NEUTRON_READ_ONLY_TOOLS).not.toContain("mutation.review.get");
  });
});
