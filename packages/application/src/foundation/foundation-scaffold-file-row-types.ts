export interface FoundationScaffoldFileRow {
  readonly path: string;
  readonly action: string;
  readonly ownership: "managed" | "project-owned";
}
