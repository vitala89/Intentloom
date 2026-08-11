import { useCallback, useState } from "react";
import { desktopClient, DesktopBridgeError } from "../desktop-client.js";
import { FoundationScaffoldPanel } from "./FoundationScaffoldPanel.js";
import {
  buildScaffoldCompareProgress,
  buildScaffoldPrepareProgress,
  buildScaffoldValidateProgress,
} from "./foundation-scaffold-view-helpers.js";
import type {
  FoundationScaffoldCompareViewModel,
  FoundationScaffoldPrepareViewModel,
  FoundationScaffoldValidateViewModel,
} from "./foundation-scaffold-view-helpers.js";

export interface FoundationScaffoldSectionProps {
  readonly workshopId: string;
}

function parseExistingPaths(value: string): readonly string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function FoundationScaffoldSection({
  workshopId,
}: FoundationScaffoldSectionProps) {
  const [prepare, setPrepare] =
    useState<FoundationScaffoldPrepareViewModel | null>(null);
  const [compare, setCompare] =
    useState<FoundationScaffoldCompareViewModel | null>(null);
  const [validate, setValidate] =
    useState<FoundationScaffoldValidateViewModel | null>(null);
  const [existingPaths, setExistingPaths] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runPrepare = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const viewmodel =
        await desktopClient.foundationScaffoldPrepare(workshopId);
      setPrepare(buildScaffoldPrepareProgress(viewmodel));
      setCompare(null);
      setValidate(null);
    } catch (error) {
      setPrepare(null);
      setErrorMessage(
        error instanceof DesktopBridgeError
          ? error.message
          : "Could not prepare the scaffold plan.",
      );
    } finally {
      setLoading(false);
    }
  }, [workshopId]);

  const runCompare = useCallback(async () => {
    if (!prepare) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const viewmodel = await desktopClient.foundationScaffoldCompare(
        workshopId,
        prepare.planId,
        parseExistingPaths(existingPaths),
      );
      setCompare(buildScaffoldCompareProgress(viewmodel));
    } catch (error) {
      setCompare(null);
      setErrorMessage(
        error instanceof DesktopBridgeError
          ? error.message
          : "Could not compare the scaffold plan.",
      );
    } finally {
      setLoading(false);
    }
  }, [existingPaths, prepare, workshopId]);

  const runValidate = useCallback(async () => {
    if (!prepare) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const viewmodel = await desktopClient.foundationScaffoldValidate(
        workshopId,
        prepare.planId,
      );
      setValidate(buildScaffoldValidateProgress(viewmodel));
    } catch (error) {
      setValidate(null);
      setErrorMessage(
        error instanceof DesktopBridgeError
          ? error.message
          : "Could not validate the scaffold plan.",
      );
    } finally {
      setLoading(false);
    }
  }, [prepare, workshopId]);

  return (
    <FoundationScaffoldPanel
      prepare={prepare}
      compare={compare}
      validate={validate}
      existingPaths={existingPaths}
      loading={loading}
      errorMessage={errorMessage}
      onExistingPathsChange={setExistingPaths}
      onPrepare={() => void runPrepare()}
      onCompare={() => void runCompare()}
      onValidate={() => void runValidate()}
    />
  );
}
