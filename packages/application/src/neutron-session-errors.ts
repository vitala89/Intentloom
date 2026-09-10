import { ProtocolValidationError } from "../../protocol/src/protocol-validation-error.js";
import type { NeutronErrorCode } from "../../protocol/src/neutron-runtime.js";

export class NeutronSessionOperationError extends Error {
  readonly clientErrorCode = "bounded_validation_failed" as const;
  readonly neutronCode: NeutronErrorCode;

  constructor(neutronCode: NeutronErrorCode, message: string) {
    super(message);
    this.name = "NeutronSessionOperationError";
    this.neutronCode = neutronCode;
  }
}

export function unknownNeutronSessionError(
  sessionId: string,
): ProtocolValidationError {
  return new ProtocolValidationError(
    -32602,
    `unknown neutron session '${sessionId}'`,
  );
}

export function neutronBindingError(message: string): ProtocolValidationError {
  return new ProtocolValidationError(-32602, message);
}
