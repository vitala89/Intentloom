import { describe, expect, it } from "vitest";
import {
  resolveProviderCredential,
  type ProviderCredentialResolution,
} from "../packages/evidence-provider/src/index.js";

describe("provider credential resolution", () => {
  it("prefers an explicit token over environment credentials", () => {
    expect(
      resolveProviderCredential("github", "explicit-token", {
        GITHUB_TOKEN: "environment-token",
      }),
    ).toEqual<ProviderCredentialResolution>({
      source: "explicit",
      token: "explicit-token",
    });
  });

  it("resolves the first non-empty supported environment alias", () => {
    expect(
      resolveProviderCredential("gitlab", undefined, {
        GITLAB_TOKEN: "",
        GL_TOKEN: "alias-token",
      }),
    ).toEqual<ProviderCredentialResolution>({
      source: "environment",
      token: "alias-token",
      environmentName: "GL_TOKEN",
    });
  });

  it("returns no credential after the environment is cleared", () => {
    expect(
      resolveProviderCredential("github", undefined, {
        GITHUB_TOKEN: undefined,
        GH_TOKEN: undefined,
      }),
    ).toEqual<ProviderCredentialResolution>({ source: "none" });
  });
});
