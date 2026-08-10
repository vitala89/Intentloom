import type {
  QUALITY_DISCIPLINE_SCHEMA_URN,
  QUALITY_ROLE_COMPOSITION_SCHEMA_URN,
} from "./common.js";

export {
  QUALITY_DISCIPLINE_SCHEMA_URN,
  QUALITY_ROLE_COMPOSITION_SCHEMA_URN,
} from "./common.js";

export type QualityDisciplineCategory =
  | "frontend"
  | "backend"
  | "full-stack"
  | "mobile"
  | "desktop"
  | "quality-engineering"
  | "devops-sre"
  | "platform-engineering"
  | "security"
  | "data-engineering"
  | "ml-ai"
  | "embedded-iot"
  | "spatial-graphics"
  | "documentation";

export interface QualityDisciplineDefinition {
  readonly schemaVersion: typeof QUALITY_DISCIPLINE_SCHEMA_URN;
  readonly id: string;
  readonly name: string;
  readonly category: QualityDisciplineCategory;
  readonly defaultConcerns: readonly string[];
  readonly supportedArchitectureStrategies: readonly string[];
}

export interface QualityRoleComposition {
  readonly schemaVersion: typeof QUALITY_ROLE_COMPOSITION_SCHEMA_URN;
  readonly id: string;
  readonly titleAlias: string;
  readonly primaryDisciplineId: string;
  readonly secondaryDisciplineIds: readonly string[];
  readonly taskScopeFilter?: readonly string[];
  readonly createdAt: string;
}
