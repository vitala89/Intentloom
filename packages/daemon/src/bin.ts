#!/usr/bin/env node
import { resolve } from "node:path";
import {
  inspectProject,
  nodeFileSystem,
  timelineProject,
} from "../../application/dist/index.js";
import { startLocalDaemon } from "./index.js";
import {
  handleProjectDiffRequest,
  handleProjectDoctorRequest,
} from "./project-health-handlers.js";
import {
  handleQualityCatalog,
  handleQualityCheckers,
  handleQualityGraph,
  handleQualityStandards,
} from "./engineering-quality-handlers.js";
import {
  handleSpecializedPacksCatalog,
  handleSpecializedPacksDetect,
  handleSpecializedPacksChecks,
} from "./specialized-pack-handlers.js";
import {
  handleSpecializedPacksExternalActivate,
  handleSpecializedPacksExternalPreview,
} from "./specialized-pack-external-handlers.js";
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
import { bindNeutronSessionHandlers } from "./neutron-session-handlers.js";
import { resolveDaemonStartupConfig } from "./daemon-startup-config.js";
import { createNeutronSessionRuntime } from "../../application/src/neutron/session/neutron-session-runtime.js";
import { OllamaModelAdapter } from "../../application/src/ollama-model-adapter.js";

async function main(): Promise<void> {
  const startup = await resolveDaemonStartupConfig(process.argv.slice(2));
  const catalogRoot = startup.catalogRoot;
  const daemon = await startLocalDaemon({
    endpoint: startup.endpoint,
    sessionToken: startup.sessionToken,
    daemonVersion: process.env.INTENTLOOM_DAEMON_VERSION ?? "development",
    enforceCanonicalRoots: true,
    diff: async (request) => handleProjectDiffRequest(request, catalogRoot),
    inspect: async (request) => {
      await inspectProject(resolve(request.params.root), nodeFileSystem);
      return {
        projectId: "project-local",
        root: resolve(request.params.root),
      };
    },
    doctor: async (request) => handleProjectDoctorRequest(request, catalogRoot),
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
    specializedPacksChecks: (request) =>
      handleSpecializedPacksChecks(request, request.params.root),
    specializedPacksExternalPreview: (request) =>
      handleSpecializedPacksExternalPreview(request, request.params.root),
    specializedPacksExternalActivate: (request) =>
      handleSpecializedPacksExternalActivate(request, request.params.root),
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
    ...bindNeutronSessionHandlers(
      createNeutronSessionRuntime({
        createAdapter: () =>
          process.env.INTENTLOOM_NEUTRON_ADAPTER === "unconfigured"
            ? null
            : new OllamaModelAdapter(),
        ...(startup.durableStateDirectory === undefined
          ? {}
          : { durableStateDirectory: startup.durableStateDirectory }),
      }),
    ),
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
