import { useCallback, useEffect, useState } from "react";
import type { NeutronSessionViewmodel } from "@intentloom/protocol";
import { desktopClient, DesktopBridgeError } from "../desktop-client.js";
import { neutronDesktopGraphNodes } from "./neutron-graph-input.js";
import {
  classifyNeutronInfrastructureError,
  parseNeutronDesktopViewmodel,
  type NeutronUiPhase,
} from "./neutron-session-viewmodel.js";

export interface UseNeutronSessionResult {
  readonly viewmodel: NeutronSessionViewmodel | null;
  readonly uiPhase: NeutronUiPhase;
  readonly infrastructureError: string | null;
  readonly prompt: string;
  readonly setPrompt: (value: string) => void;
  readonly createSession: () => Promise<void>;
  readonly runTurn: () => Promise<void>;
  readonly runGraph: () => Promise<void>;
  readonly cancelSession: () => Promise<void>;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useNeutronSession(
  root: string | null,
): UseNeutronSessionResult {
  const [viewmodel, setViewmodel] = useState<NeutronSessionViewmodel | null>(
    null,
  );
  const [uiPhase, setUiPhase] = useState<NeutronUiPhase>("idle");
  const [infrastructureError, setInfrastructureError] = useState<string | null>(
    null,
  );
  const [prompt, setPrompt] = useState("");
  const [op, setOp] = useState<"turn" | "graph" | null>(null);

  useEffect(() => {
    setViewmodel(null);
    setUiPhase("idle");
    setInfrastructureError(null);
    setPrompt("");
    setOp(null);
  }, [root]);

  const captureError = useCallback((error: unknown) => {
    const bridge =
      error instanceof DesktopBridgeError
        ? error
        : new DesktopBridgeError(messageOf(error));
    if (classifyNeutronInfrastructureError(bridge)) {
      setInfrastructureError(bridge.message);
      return;
    }
    setInfrastructureError(null);
    throw bridge;
  }, []);

  const recover = useCallback(
    (error: unknown) => {
      try {
        captureError(error);
      } catch (runtimeError) {
        setInfrastructureError(messageOf(runtimeError));
      }
    },
    [captureError],
  );

  const createSession = useCallback(async () => {
    if (root === null) return;
    setUiPhase("connecting");
    setInfrastructureError(null);
    try {
      const payload = await desktopClient.neutronSessionCreate(root);
      setViewmodel(parseNeutronDesktopViewmodel(payload));
      setUiPhase("idle");
    } catch (error: unknown) {
      setUiPhase("idle");
      recover(error);
    }
  }, [root, recover]);

  const runTurn = useCallback(async () => {
    if (root === null || viewmodel === null || prompt.trim().length === 0) {
      return;
    }
    setUiPhase("submitting");
    setOp("turn");
    setInfrastructureError(null);
    try {
      const payload = await desktopClient.neutronTurnExecute(
        root,
        viewmodel.session.sessionId,
        viewmodel.session.projectId,
        prompt,
      );
      setViewmodel(parseNeutronDesktopViewmodel(payload));
    } catch (error: unknown) {
      recover(error);
    } finally {
      setUiPhase("idle");
      setOp(null);
    }
  }, [root, viewmodel, prompt, recover]);

  const runGraph = useCallback(async () => {
    if (root === null || viewmodel === null || prompt.trim().length === 0) {
      return;
    }
    setUiPhase("submitting");
    setOp("graph");
    setInfrastructureError(null);
    try {
      const payload = await desktopClient.neutronGraphExecute(
        root,
        viewmodel.session.sessionId,
        viewmodel.session.projectId,
        neutronDesktopGraphNodes(prompt),
      );
      setViewmodel(parseNeutronDesktopViewmodel(payload));
    } catch (error: unknown) {
      recover(error);
    } finally {
      setUiPhase("idle");
      setOp(null);
    }
  }, [root, viewmodel, prompt, recover]);

  const cancelSession = useCallback(async () => {
    if (root === null || viewmodel === null) return;
    setUiPhase("cancelling");
    try {
      const payload =
        op === "graph"
          ? await desktopClient.neutronGraphCancel(
              root,
              viewmodel.session.sessionId,
              viewmodel.session.projectId,
              viewmodel.graphSnapshot?.graphId,
            )
          : await desktopClient.neutronSessionCancel(
              root,
              viewmodel.session.sessionId,
              viewmodel.session.projectId,
            );
      setViewmodel(parseNeutronDesktopViewmodel(payload));
    } catch (error: unknown) {
      recover(error);
    } finally {
      setUiPhase("idle");
      setOp(null);
    }
  }, [root, viewmodel, op, recover]);

  return {
    viewmodel,
    uiPhase,
    infrastructureError,
    prompt,
    setPrompt,
    createSession,
    runTurn,
    runGraph,
    cancelSession,
  };
}
