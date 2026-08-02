import type { ProviderName } from "./index.js";

export const PROVIDER_CREDENTIAL_ENV_NAMES: Readonly<
  Record<ProviderName, readonly string[]>
> = {
  github: ["GITHUB_TOKEN", "GH_TOKEN"],
  gitlab: ["GITLAB_TOKEN", "GL_TOKEN"],
};

export type ProviderCredentialSource = "explicit" | "environment" | "none";

export interface ProviderCredentialResolution {
  readonly source: ProviderCredentialSource;
  readonly token?: string;
  readonly environmentName?: string;
}

export function resolveProviderCredential(
  provider: ProviderName,
  explicitToken: string | undefined,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): ProviderCredentialResolution {
  if (explicitToken !== undefined) {
    return explicitToken.length > 0
      ? { source: "explicit", token: explicitToken }
      : { source: "none" };
  }

  for (const environmentName of PROVIDER_CREDENTIAL_ENV_NAMES[provider]) {
    const token = environment[environmentName];
    if (token) return { source: "environment", token, environmentName };
  }
  return { source: "none" };
}
