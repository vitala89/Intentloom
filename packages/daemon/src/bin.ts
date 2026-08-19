#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import {
  diffProject,
  doctorProject,
  inspectProject,
  nodeFileSystem,
  timelineProject,
} from "../../application/dist/index.js";
import { startLocalDaemon } from "./index.js";
import {
  handleQualityCatalog,
  handleQualityCheckers,
  handleQualityGraph,
  handleQualityStandards,
} from "./engineering-quality-handlers.js";
import {
  handleSpecializedPacksCatalog,
  handleSpecializedPacksDetect,
} from "./specialized-pack-handlers.js";
import {
  handleInceptionAnswerRecord,
  handleInceptionConflictsIdentify,
  handleInceptionQuestionsList,
  handleInceptionSessionCreate,
  handleInceptionSessionDelete,
  handleInceptionSessionExport,
  handleInceptionSessionGet,
  handleInceptionStateSummarize,
} from "./inception-handlers.js";
import {
  handleFoundationAnswerRecord,
  handleFoundationConflictsIdentify,
  handleFoundationQuestionsList,
  handleFoundationReadinessEvaluate,
  handleFoundationUnderstandingSummarize,
  handleFoundationWorkshopCreate,
  handleFoundationWorkshopDelete,
  handleFoundationDiscoveryQuestions,
  handleFoundationDiscoveryTurn,
  handleFoundationBlueprintPropose,
  handleFoundationBlueprintCompare,
  handleFoundationBlueprintApprove,
  handleFoundationBlueprintRevoke,
  handleFoundationWorkshopExport,
  handleFoundationWorkshopGet,
} from "./foundation-handlers.js";
import {
  handleFoundationScaffoldApply,
  handleFoundationScaffoldCompare,
  handleFoundationScaffoldGet,
  handleFoundationScaffoldPrepare,
  handleFoundationScaffoldRollback,
  handleFoundationScaffoldValidate,
} from "./foundation-scaffold-handlers.js";
import {
  handleExistingProjectAdoptionDecisions,
  handleExistingProjectAdoptionPlan,
  handleExistingProjectWorkspacePrepare,
} from "./existing-project-handlers.js";
import {
  handleExistingProjectAdoptionApprove,
  handleExistingProjectAdoptionPrepare,
  handleExistingProjectAdoptionRevalidate,
} from "./existing-project-prepared-plan-handlers.js";
import { handleExistingProjectAdoptionApply } from "./existing-project-apply-handlers.js";
import {
  handleFeatureIntentWorkspaceAnalyze,
  handleFeatureIntentWorkspacePrepare,
} from "./feature-intent-handlers.js";
import {
  handleBoundedExecutionWorkspaceExecute,
  handleBoundedExecutionWorkspacePrepare,
} from "./bounded-execution-handlers.js";
import {
  handleContinuousLoopWorkspaceExecute,
  handleContinuousLoopWorkspacePrepare,
} from "./continuous-loop-handlers.js";

function value(args: readonly string[], flag: string): string {
  const index = args.indexOf(flag);
  const candidate = index < 0 ? undefined : args[index + 1];
  if (candidate === undefined || candidate.startsWith("--"))
    throw new Error(`missing ${flag}`);
  return candidate;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const endpoint = value(args, "--endpoint");
  const tokenFile = value(args, "--token-file");
  const catalogRoot = value(args, "--catalog-root");
  const tokenStats = await stat(tokenFile);
  if (!tokenStats.isFile())
    throw new Error("token file must be a regular file");
  if (process.platform !== "win32" && (tokenStats.mode & 0o077) !== 0)
    throw new Error(
      "token file must not be accessible to group or other users",
    );
  const sessionToken = (await readFile(tokenFile, "utf8")).trim();
  const daemon = await startLocalDaemon({
    endpoint,
    sessionToken,
    daemonVersion: process.env.INTENTLOOM_DAEMON_VERSION ?? "development",
    enforceCanonicalRoots: true,
    diff: async (request) => {
      const result = await diffProject(
        {
          root: request.params.root,
          profile: request.params.profile,
          adapters: request.params.adapters as never,
          dryRun: true,
          catalogRoot,
        },
        nodeFileSystem,
      );
      return {
        operationVersion: 1,
        root: request.params.root,
        changes: result.changes,
        diagnostics: result.diagnostics,
      };
    },
    inspect: async (request) => {
      await inspectProject(resolve(request.params.root), nodeFileSystem);
      return {
        projectId: "project-local",
        root: resolve(request.params.root),
      };
    },
    doctor: async (request) => {
      const report = await doctorProject(
        {
          root: resolve(request.params.root),
          profile: request.params.profile,
          adapters: request.params.adapters as never,
          dryRun: true,
          catalogRoot,
        },
        nodeFileSystem,
      );
      return {
        findings: report.findings.map(
          ({ code, severity, category, path, message }) => ({
            code,
            severity,
            category,
            path,
            message,
          }),
        ),
        diagnostics: report.diagnostics,
        exitCode: report.findings.some(
          (finding) => finding.severity === "error",
        )
          ? 3
          : 0,
      };
    },
    timeline: async (request) => {
      const result = await timelineProject({
        root: request.params.root,
        caseId: request.params.caseId,
        limit: request.params.limit,
        timeoutMs: request.params.timeoutMs,
        maxOutputBytes: request.params.maxOutputBytes,
      });
      return {
        operationVersion: 1,
        root: result.root,
        caseType: result.caseType,
        caseId: result.caseId,
        quality: result.quality,
        events: result.events,
        findings: result.findings,
        diagnostics: result.diagnostics,
      };
    },
    qualityStandards: (request) =>
      handleQualityStandards(request, request.params.root),
    qualityCatalog: (request) =>
      handleQualityCatalog(request, request.params.root),
    qualityCheckers: (request) =>
      handleQualityCheckers(request, request.params.root),
    qualityGraph: (request) => handleQualityGraph(request, request.params.root),
    specializedPacksCatalog: (request) =>
      handleSpecializedPacksCatalog(request, request.params.root),
    specializedPacksDetect: (request) =>
      handleSpecializedPacksDetect(request, request.params.root),
    inceptionSessionCreate: handleInceptionSessionCreate,
    inceptionSessionGet: handleInceptionSessionGet,
    inceptionQuestionsList: handleInceptionQuestionsList,
    inceptionAnswerRecord: handleInceptionAnswerRecord,
    inceptionStateSummarize: handleInceptionStateSummarize,
    inceptionConflictsIdentify: handleInceptionConflictsIdentify,
    inceptionSessionExport: handleInceptionSessionExport,
    inceptionSessionDelete: handleInceptionSessionDelete,
    foundationWorkshopCreate: handleFoundationWorkshopCreate,
    foundationWorkshopGet: handleFoundationWorkshopGet,
    foundationQuestionsList: handleFoundationQuestionsList,
    foundationAnswerRecord: handleFoundationAnswerRecord,
    foundationUnderstandingSummarize: handleFoundationUnderstandingSummarize,
    foundationConflictsIdentify: handleFoundationConflictsIdentify,
    foundationReadinessEvaluate: handleFoundationReadinessEvaluate,
    foundationWorkshopExport: handleFoundationWorkshopExport,
    foundationWorkshopDelete: handleFoundationWorkshopDelete,
    foundationDiscoveryQuestions: handleFoundationDiscoveryQuestions,
    foundationDiscoveryTurn: handleFoundationDiscoveryTurn,
    foundationBlueprintPropose: handleFoundationBlueprintPropose,
    foundationBlueprintCompare: handleFoundationBlueprintCompare,
    foundationBlueprintApprove: handleFoundationBlueprintApprove,
    foundationBlueprintRevoke: handleFoundationBlueprintRevoke,
    foundationScaffoldPrepare: handleFoundationScaffoldPrepare,
    foundationScaffoldGet: handleFoundationScaffoldGet,
    foundationScaffoldCompare: handleFoundationScaffoldCompare,
    foundationScaffoldValidate: handleFoundationScaffoldValidate,
    foundationScaffoldApply: handleFoundationScaffoldApply,
    foundationScaffoldRollback: handleFoundationScaffoldRollback,
    existingProjectWorkspacePrepare: handleExistingProjectWorkspacePrepare,
    existingProjectAdoptionPlan: (request) =>
      handleExistingProjectAdoptionPlan(request, { catalogRoot }),
    existingProjectAdoptionDecisions: (request) =>
      handleExistingProjectAdoptionDecisions(request, { catalogRoot }),
    existingProjectAdoptionPrepare: (request) =>
      handleExistingProjectAdoptionPrepare(request, { catalogRoot }),
    existingProjectAdoptionRevalidate: (request) =>
      handleExistingProjectAdoptionRevalidate(request, { catalogRoot }),
    existingProjectAdoptionApprove: (request) =>
      handleExistingProjectAdoptionApprove(request, { catalogRoot }),
    existingProjectAdoptionApply: (request) =>
      handleExistingProjectAdoptionApply(request, { catalogRoot }),
    featureIntentWorkspacePrepare: handleFeatureIntentWorkspacePrepare,
    featureIntentWorkspaceAnalyze: handleFeatureIntentWorkspaceAnalyze,
    boundedExecutionWorkspacePrepare: handleBoundedExecutionWorkspacePrepare,
    boundedExecutionWorkspaceExecute: handleBoundedExecutionWorkspaceExecute,
    continuousLoopWorkspacePrepare: handleContinuousLoopWorkspacePrepare,
    continuousLoopWorkspaceExecute: handleContinuousLoopWorkspaceExecute,
  });
  const stop = () => void daemon.close().then(() => process.exit(0));
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "daemon startup failed"}\n`,
  );
  process.exitCode = 2;
});
