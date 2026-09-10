import { useCallback, useEffect, useState } from "react";
import type { NeutronSessionViewmodel } from "@intentloom/protocol";
import { desktopClient, DesktopBridgeError } from "../desktop-client.js";
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
  readonly cancelSession: () => Promise<void>;
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

  useEffect(() => {
    setViewmodel(null);
    setUiPhase("idle");
    setInfrastructureError(null);
    setPrompt("");
  }, [root]);

  const captureError = useCallback((error: unknown) => {
    const bridge =
      error instanceof DesktopBridgeError
        ? error
        : new DesktopBridgeError(
            error instanceof Error ? error.message : String(error),
          );
    if (classifyNeutronInfrastructureError(bridge)) {
      setInfrastructureError(bridge.message);
      return;
    }
    setInfrastructureError(null);
    throw bridge;
  }, []);

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
      try {
        captureError(error);
      } catch (runtimeError) {
        const message =
          runtimeError instanceof Error
            ? runtimeError.message
            : String(runtimeError);
        setInfrastructureError(message);
      }
    }
  }, [root, captureError]);

  const runTurn = useCallback(async () => {
    if (root === null || viewmodel === null || prompt.trim().length === 0) {
      return;
    }
    setUiPhase("submitting");
    setInfrastructureError(null);
    try {
      const payload = await desktopClient.neutronTurnExecute(
        root,
        viewmodel.session.sessionId,
        viewmodel.session.projectId,
        prompt,
      );
      setViewmodel(parseNeutronDesktopViewmodel(payload));
      setUiPhase("idle");
    } catch (error: unknown) {
      setUiPhase("idle");
      try {
        captureError(error);
      } catch (runtimeError) {
        const message =
          runtimeError instanceof Error
            ? runtimeError.message
            : String(runtimeError);
        setInfrastructureError(message);
      }
    }
  }, [root, viewmodel, prompt, captureError]);

  const cancelSession = useCallback(async () => {
    if (root === null || viewmodel === null) return;
    setUiPhase("cancelling");
    try {
      const payload = await desktopClient.neutronSessionCancel(
        root,
        viewmodel.session.sessionId,
        viewmodel.session.projectId,
      );
      setViewmodel(parseNeutronDesktopViewmodel(payload));
    } catch (error: unknown) {
      try {
        captureError(error);
      } catch (runtimeError) {
        const message =
          runtimeError instanceof Error
            ? runtimeError.message
            : String(runtimeError);
        setInfrastructureError(message);
      }
    } finally {
      setUiPhase("idle");
    }
  }, [root, viewmodel, captureError]);

  return {
    viewmodel,
    uiPhase,
    infrastructureError,
    prompt,
    setPrompt,
    createSession,
    runTurn,
    cancelSession,
  };
}
