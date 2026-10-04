import { useCallback, useEffect, useRef, useState } from "react";
import { neutronMutationRecoveryDesktopPorts } from "../desktop-client-neutron-approve-apply.js";
import { mutationReviewScopeKey } from "./neutron-mutation-review-state.js";
import type { NeutronMutationReviewScope } from "./neutron-mutation-review-state.js";
import {
  createNeutronMutationRecovery,
  type NeutronMutationRecoveryController,
  type NeutronMutationRecoveryPorts,
  type NeutronMutationSubmitInput,
} from "./neutron-mutation-recovery-controller.js";
import type { NeutronMutationRecoveryModel } from "./neutron-mutation-recovery-model.js";

export function useNeutronMutationRecovery(input: {
  readonly scope: NeutronMutationReviewScope | null;
  readonly daemonReady: boolean;
  readonly port?: NeutronMutationRecoveryPorts;
}): {
  readonly model: NeutronMutationRecoveryModel;
  readonly submit: (
    request: NeutronMutationSubmitInput,
  ) => Promise<NeutronMutationRecoveryModel>;
  readonly refresh: () => Promise<NeutronMutationRecoveryModel>;
  readonly retryVerification: () => Promise<NeutronMutationRecoveryModel>;
  readonly cancelVerification: () => void;
} {
  const controllerRef = useRef<NeutronMutationRecoveryController | null>(null);
  if (controllerRef.current === null) {
    controllerRef.current = createNeutronMutationRecovery(
      input.port ?? neutronMutationRecoveryDesktopPorts(),
      { daemonReady: input.daemonReady },
    );
  }
  const controller = controllerRef.current;
  const [model, setModel] = useState(() => controller.model());
  const scopeKey =
    input.scope === null ? "" : mutationReviewScopeKey(input.scope);
  const seenScope = useRef<string | null>(null);
  if (seenScope.current !== scopeKey) {
    seenScope.current = scopeKey;
    const next = controller.setScope(input.scope);
    if (next !== model) setModel(next);
  }
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const publish = useCallback((next: NeutronMutationRecoveryModel) => {
    if (mounted.current) setModel(next);
  }, []);
  const skipReady = useRef(true);
  useEffect(() => {
    if (skipReady.current) {
      skipReady.current = false;
      return;
    }
    let active = true;
    void controller.setDaemonReady(input.daemonReady).then((next) => {
      if (active) publish(next);
    });
    return () => {
      active = false;
    };
  }, [controller, input.daemonReady, publish]);
  const submit = useCallback(
    (request: NeutronMutationSubmitInput) =>
      controller.submit(request).then((next) => {
        publish(next);
        return next;
      }),
    [controller, publish],
  );
  const refresh = useCallback(
    () =>
      controller.refresh().then((next) => {
        publish(next);
        return next;
      }),
    [controller, publish],
  );
  const retryVerification = useCallback(
    () =>
      controller.retryVerification().then((next) => {
        publish(next);
        return next;
      }),
    [controller, publish],
  );
  const cancelVerification = useCallback(() => {
    controller.cancelVerification();
  }, [controller]);
  return { cancelVerification, model, refresh, retryVerification, submit };
}
