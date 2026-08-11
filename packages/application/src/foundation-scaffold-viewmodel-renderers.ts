import type {
  FoundationScaffoldCompareViewModel,
  FoundationScaffoldPrepareViewModel,
  FoundationScaffoldValidateViewModel,
} from "./foundation-scaffold-client-viewmodel.js";

export function renderFoundationScaffoldPrepareText(
  vm: FoundationScaffoldPrepareViewModel,
): string {
  const lines = [
    `Foundation scaffold plan: ${vm.workshopId}`,
    `Plan id: ${vm.planId}`,
    `Root: ${vm.root}`,
    `Plan digest: ${vm.planDigest}`,
    `Blueprint digest: ${vm.blueprintDigest}`,
    `Expires at: ${vm.expiresAt}`,
    `Workshop unchanged: ${vm.workshopUnchanged ? "yes" : "no"}`,
    `Files: ${vm.files.length}`,
    `Dependencies: ${vm.dependencies.join(", ") || "none"}`,
    `Scripts: ${vm.scripts.join(", ") || "none"}`,
    `Verification checks: ${vm.verificationChecks.join(", ") || "none"}`,
    `Required capabilities: ${vm.requiredCapabilities.join(", ") || "none"}`,
    `Templates: ${vm.templateVersions.join(", ") || "none"}`,
    `Surface state: ${vm.surfaceState}`,
  ];
  for (const file of vm.files) {
    lines.push(`  - [${file.action}] ${file.path} (${file.ownership})`);
  }
  return lines.join("\n");
}

export function renderFoundationScaffoldCompareText(
  vm: FoundationScaffoldCompareViewModel,
): string {
  return [
    `Foundation scaffold compare: ${vm.workshopId}`,
    `Plan id: ${vm.planId}`,
    `Created: ${vm.created.length}`,
    `Skipped: ${vm.skipped.length}`,
    `Collisions: ${vm.collisions.length}`,
    `Surface state: ${vm.surfaceState}`,
    vm.collisions.length > 0
      ? `Collision paths: ${vm.collisions.join(", ")}`
      : "Collision paths: none",
  ].join("\n");
}

export function renderFoundationScaffoldValidateText(
  vm: FoundationScaffoldValidateViewModel,
): string {
  return [
    `Foundation scaffold validate: ${vm.workshopId}`,
    `Plan id: ${vm.planId}`,
    `Valid: ${vm.valid ? "yes" : "no"}`,
    `Plan digest: ${vm.planDigest}`,
    `Approval required: ${vm.approvalRequired ? "yes" : "no"}`,
    `Expires at: ${vm.expiresAt}`,
    `Surface state: ${vm.surfaceState}`,
  ].join("\n");
}
