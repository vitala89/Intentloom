import { describe, expect, it } from "vitest";
import { DesktopBridgeError } from "../apps/desktop/src/desktop-client.js";
import {
  inspectStatusForError,
  isCancelControlVisible,
  statusAfterClientCancel,
} from "../apps/desktop/src/desktop-bridge-status.js";
import {
  createDoctorRequest,
  createProjectDiffRequest,
} from "@intentloom/protocol";

describe("desktop daemon recovery client state", () => {
  it("keeps Cancel visible only while an operation is loading", () => {
    expect(isCancelControlVisible(true)).toBe(true);
    expect(isCancelControlVisible(false)).toBe(false);
  });

  it("returns loading views to idle after client cancel so later Retry can run", () => {
    expect(statusAfterClientCancel("loading")).toBe("idle");
    expect(statusAfterClientCancel("disconnected")).toBe("disconnected");
    expect(statusAfterClientCancel("ready")).toBe("ready");
    expect(statusAfterClientCancel("error")).toBe("error");
  });

  it("does not treat live RPC validation as a disconnected daemon", () => {
    expect(
      inspectStatusForError(
        new DesktopBridgeError(
          "profile must be a non-empty string",
          "bounded_validation_failed",
        ),
      ),
    ).toBe("error");
    expect(
      inspectStatusForError(
        new DesktopBridgeError(
          "an existing daemon endpoint did not respond",
          "disconnected",
        ),
      ),
    ).toBe("disconnected");
  });

  it("forwards Doctor and Diff requests without a hardcoded profile", () => {
    expect(
      createDoctorRequest("desktop-doctor", {
        root: "/Users/eugenekasap/WebstormProjects/intentloom-dogfood/vii-desktop-final",
      }).params,
    ).toEqual({
      protocolVersion: 1,
      root: "/Users/eugenekasap/WebstormProjects/intentloom-dogfood/vii-desktop-final",
    });
    expect(
      createProjectDiffRequest("desktop-diff", {
        root: "/Users/eugenekasap/WebstormProjects/intentloom-dogfood/vii-desktop-final",
      }).params,
    ).toEqual({
      protocolVersion: 1,
      root: "/Users/eugenekasap/WebstormProjects/intentloom-dogfood/vii-desktop-final",
    });
  });
});
