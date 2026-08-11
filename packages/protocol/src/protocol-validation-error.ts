export class ProtocolValidationError extends Error {
  constructor(
    readonly code: -32600 | -32601 | -32602,
    message: string,
  ) {
    super(message);
  }
}
