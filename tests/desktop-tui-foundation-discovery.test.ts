import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildFoundationDiscoveryQuestionsViewModel,
  buildFoundationDiscoveryTurnViewModel,
  clearFoundationWorkshopStore,
  createFoundationWorkshop,
  discoverFoundationAdaptiveQuestions,
  installFoundationFixture,
  installFoundationFixtureCatalog,
  loadFoundationFixtureCatalog,
  renderFoundationDiscoveryQuestionsText,
  renderFoundationDiscoveryTurnText,
  runFoundationCliCommand,
  runFoundationDiscoveryTurn,
} from "@intentloom/application";
import {
  FOUNDATION_DISCOVERY_QUESTION_LIST_SCHEMA_URN,
  FOUNDATION_DISCOVERY_TURN_SCHEMA_URN,
} from "@intentloom/protocol";

const fixturePath = resolve(
  process.cwd(),
  "tests/fixtures/foundation/workshop-states.v1.json",
);

afterEach(() => {
  clearFoundationWorkshopStore();
});

describe("Engineering Workspace W3 Client: Desktop and TUI discovery viewmodels", () => {
  it("renders discovery turn text with visibility and proposal metadata", async () => {
    createFoundationWorkshop({
      root: "/tmp/foundation-discovery-client-turn",
      idea: "Discovery client turn",
      workshopId: "fnd_fixture_discovery_client_turn",
    });
    const turn = await runFoundationDiscoveryTurn(
      "fnd_fixture_discovery_client_turn",
      { effort: "medium" },
    );
    const vm = buildFoundationDiscoveryTurnViewModel(turn, "ready");
    const text = renderFoundationDiscoveryTurnText(vm);

    expect(text).toContain(
      "Foundation discovery turn: fnd_fixture_discovery_client_turn",
    );
    expect(text).toContain("Agent status: completed");
    expect(text).toContain("Workshop unchanged: yes");
    expect(text).toContain(`Provider: ${turn.visibility.provider}`);
    expect(text).toContain("Proposed questions:");
    expect(text).toContain("Surface state: ready");
  });

  it("renders adaptive question lists for each effort level", async () => {
    const catalog = await loadFoundationFixtureCatalog(fixturePath);
    installFoundationFixtureCatalog(catalog);
    installFoundationFixture("foundation-fixture-partial-discovering", catalog);

    for (const effort of ["low", "medium", "high"] as const) {
      const list = discoverFoundationAdaptiveQuestions(
        "fnd_fixture_partial_discovering",
        { effort },
      );
      const vm = buildFoundationDiscoveryQuestionsViewModel(list, "ready");
      const text = renderFoundationDiscoveryQuestionsText(vm);
      expect(text).toContain(
        "Adaptive discovery questions: fnd_fixture_partial_discovering",
      );
      expect(text).toContain(`Effort: ${effort}`);
      expect(text).toContain(`Count: ${list.questions.length}`);
    }
  });

  it("keeps CLI discover-turn parity with discovery turn viewmodels", async () => {
    createFoundationWorkshop({
      root: "/tmp/foundation-discovery-cli-parity",
      idea: "CLI parity",
      workshopId: "fnd_fixture_discovery_cli_parity",
    });

    const cliTurn = await runFoundationCliCommand("discover-turn", {
      workshopId: "fnd_fixture_discovery_cli_parity",
      effort: "high",
      json: true,
    });
    expect(cliTurn.exitCode).toBe(0);
    const cliPayload = JSON.parse(cliTurn.stdout) as {
      schemaVersion: string;
      workshopId: string;
      proposedQuestions: readonly unknown[];
    };
    expect(cliPayload.schemaVersion).toBe(FOUNDATION_DISCOVERY_TURN_SCHEMA_URN);

    const appTurn = await runFoundationDiscoveryTurn(
      "fnd_fixture_discovery_cli_parity",
      { effort: "high" },
    );
    const vm = buildFoundationDiscoveryTurnViewModel(appTurn, "ready");
    expect(vm.workshopId).toBe(cliPayload.workshopId);
    expect(vm.proposedQuestions.length).toBe(
      cliPayload.proposedQuestions.length,
    );
    expect(vm.workshopUnchanged).toBe(true);
  });

  it("keeps CLI discover-questions parity with adaptive question viewmodels", async () => {
    createFoundationWorkshop({
      root: "/tmp/foundation-discovery-questions-parity",
      idea: "Questions parity",
      workshopId: "fnd_fixture_discovery_questions_parity",
    });

    const cliQuestions = await runFoundationCliCommand("discover-questions", {
      workshopId: "fnd_fixture_discovery_questions_parity",
      effort: "medium",
      json: true,
    });
    expect(cliQuestions.exitCode).toBe(0);
    const cliPayload = JSON.parse(cliQuestions.stdout) as {
      schemaVersion: string;
      questions: readonly unknown[];
    };
    expect(cliPayload.schemaVersion).toBe(
      FOUNDATION_DISCOVERY_QUESTION_LIST_SCHEMA_URN,
    );

    const appQuestions = discoverFoundationAdaptiveQuestions(
      "fnd_fixture_discovery_questions_parity",
      { effort: "medium" },
    );
    const vm = buildFoundationDiscoveryQuestionsViewModel(
      appQuestions,
      "ready",
    );
    expect(vm.questions.length).toBe(cliPayload.questions.length);
    expect(vm.effort).toBe("medium");
  });
});
