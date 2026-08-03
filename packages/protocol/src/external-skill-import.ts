export type ExternalSkillSourceType =
  "local-directory" | "local-archive" | "remote-pinned-sha256";

export type ExternalSkillRiskLevel = "low" | "medium" | "high" | "critical";

export interface ExternalSkillImportRequest {
  readonly schemaVersion: 1;
  readonly skillName: string;
  readonly sourceType: ExternalSkillSourceType;
  readonly sourceUri: string;
  readonly content: string;
  readonly expectedSha256?: string;
}

export interface ExternalSkillNormalizationResult {
  readonly schemaVersion: 1;
  readonly normalizedName: string;
  readonly digestSha256: string;
  readonly declaredCapabilities: readonly string[];
  readonly license?: string;
  readonly entryPoints: readonly string[];
  readonly riskLevel: ExternalSkillRiskLevel;
  readonly diagnostics: readonly string[];
}

export interface ExternalSkillImportProposal {
  readonly schemaVersion: 1;
  readonly proposalId: string;
  readonly normalization: ExternalSkillNormalizationResult;
  readonly status: "proposed" | "inactive";
  readonly requiredApprovals: readonly string[];
  readonly safeNextAction: string;
}
