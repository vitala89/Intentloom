import type { QUALITY_DISCIPLINE_ALIAS_SCHEMA_URN } from "./common.js";

export { QUALITY_DISCIPLINE_ALIAS_SCHEMA_URN } from "./common.js";

export interface QualityDisciplineAlias {
  readonly schemaVersion: typeof QUALITY_DISCIPLINE_ALIAS_SCHEMA_URN;
  readonly aliasId: string;
  readonly humanTitle: string;
  readonly targetDisciplineId: string;
  readonly organizationScope?: string;
  readonly createdAt: string;
}
