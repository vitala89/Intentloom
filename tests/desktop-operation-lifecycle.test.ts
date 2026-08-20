import { describe, expect, it } from "vitest";
import {
  deriveIsOperationLoading,
  idleOperationLoadingFlags,
  shouldAutoLoadDoctor,
  terminalizeConnectAbortInspectStatus,
} from "../apps/desktop/src/desktop-operation-lifecycle.js";
import type { OperationLoadingFlags } from "../apps/desktop/src/desktop-operation-lifecycle.js";

const DOGFOOD_ROOT =
  "/Users/eugenekasap/WebstormProjects/intentloom-dogfood/vii-desktop-final";

function flags(
  overrides: Partial<OperationLoadingFlags> = {},
): OperationLoadingFlags {
  return { ...idleOperationLoadingFlags(), ...overrides };
}

describe("desktop operation loading lifecycle", () => {
  it("keeps Cancel hidden when every loading flag is terminal", () => {
    expect(deriveIsOperationLoading(idleOperationLoadingFlags())).toBe(false);
    expect(
      deriveIsOperationLoading(
        flags({
          inspectStatus: "ready",
          doctorStatus: "ready",
        }),
      ),
    ).toBe(false);
  });

  it("initial Connect + Inspect + Doctor success clears all loading flags", () => {
    const connecting = flags({
      isConnecting: true,
      inspectStatus: "loading",
    });
    expect(deriveIsOperationLoading(connecting)).toBe(true);

    const inspectReady = flags({
      isConnecting: true,
      inspectStatus: "ready",
      doctorStatus: "loading",
    });
    expect(deriveIsOperationLoading(inspectReady)).toBe(true);

    const complete = flags({
      inspectStatus: "ready",
      doctorStatus: "ready",
    });
    expect(deriveIsOperationLoading(complete)).toBe(false);
  });

  it("initial Doctor error hides Cancel once terminal", () => {
    const terminal = flags({
      inspectStatus: "ready",
      doctorStatus: "error",
    });
    expect(deriveIsOperationLoading(terminal)).toBe(false);
  });

  it("explicit Refresh Doctor shows Cancel only while loading", () => {
    const refreshing = flags({ doctorStatus: "loading" });
    expect(deriveIsOperationLoading(refreshing)).toBe(true);

    const refreshed = flags({ doctorStatus: "ready" });
    expect(deriveIsOperationLoading(refreshed)).toBe(false);
  });

  it("explicit Refresh failure hides Cancel after terminal error", () => {
    const failed = flags({ doctorStatus: "disconnected" });
    expect(deriveIsOperationLoading(failed)).toBe(false);
  });

  it("user Cancel returns loading views to idle and hides Cancel", () => {
    const cancelled = flags({
      inspectStatus: "idle",
      doctorStatus: "idle",
      diffStatus: "idle",
      timelineStatus: "idle",
    });
    expect(deriveIsOperationLoading(cancelled)).toBe(false);
  });

  it("retry after Cancel can load again with truthful Cancel visibility", () => {
    const retrying = flags({ doctorStatus: "loading" });
    expect(deriveIsOperationLoading(retrying)).toBe(true);

    const retried = flags({ doctorStatus: "ready" });
    expect(deriveIsOperationLoading(retried)).toBe(false);
  });

  it("root switch does not leak stale Cancel state between projects", () => {
    const staleInspect = flags({
      inspectStatus: "loading",
      doctorStatus: "ready",
    });
    expect(deriveIsOperationLoading(staleInspect)).toBe(true);

    const afterSwitch = idleOperationLoadingFlags();
    expect(deriveIsOperationLoading(afterSwitch)).toBe(false);
  });

  it("Diff loading preserves existing Cancel behavior", () => {
    expect(deriveIsOperationLoading(flags({ diffStatus: "loading" }))).toBe(
      true,
    );
    expect(deriveIsOperationLoading(flags({ diffStatus: "ready" }))).toBe(
      false,
    );
  });

  it("does not auto-load Doctor while Connect owns the pipeline", () => {
    expect(
      shouldAutoLoadDoctor({
        activeView: "Doctor",
        root: DOGFOOD_ROOT,
        daemonInfo: { daemonVersion: "test" },
        doctorStatus: "idle",
        doctor: null,
        isConnecting: true,
      }),
    ).toBe(false);
  });

  it("auto-loads Doctor when Connect is idle and prerequisites are met", () => {
    expect(
      shouldAutoLoadDoctor({
        activeView: "Doctor",
        root: DOGFOOD_ROOT,
        daemonInfo: { daemonVersion: "test" },
        doctorStatus: "idle",
        doctor: null,
        isConnecting: false,
      }),
    ).toBe(true);
  });

  it("terminalizes stale inspect loading when Connect aborts mid-flight", () => {
    expect(terminalizeConnectAbortInspectStatus("loading", true)).toBe("idle");
    expect(terminalizeConnectAbortInspectStatus("ready", true)).toBe("ready");
    expect(terminalizeConnectAbortInspectStatus("loading", false)).toBe(
      "loading",
    );
  });

  it("reproduces stale Cancel from superseded Connect inspect", () => {
    const doctorReadyWhileInspectLoading = flags({
      inspectStatus: "loading",
      doctorStatus: "ready",
    });
    expect(deriveIsOperationLoading(doctorReadyWhileInspectLoading)).toBe(true);

    const fixedInspect = terminalizeConnectAbortInspectStatus("loading", true);
    const afterAbortCleanup = flags({
      inspectStatus: fixedInspect,
      doctorStatus: "ready",
    });
    expect(deriveIsOperationLoading(afterAbortCleanup)).toBe(false);
  });
});
