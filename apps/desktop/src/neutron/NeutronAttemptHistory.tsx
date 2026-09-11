import type { NeutronGraphAttemptSnapshot } from "@intentloom/protocol";
import { attemptLine } from "./neutron-graph-copy.js";

export interface NeutronAttemptHistoryProps {
  readonly attempts: readonly NeutronGraphAttemptSnapshot[];
}

export function NeutronAttemptHistory({
  attempts,
}: NeutronAttemptHistoryProps) {
  if (attempts.length === 0) {
    return <p>No attempts recorded</p>;
  }
  return (
    <ol>
      {attempts.map((attempt) => (
        <li key={attempt.attempt}>
          {attemptLine(attempt)}
          {attempt.errorCode !== null ? ` error ${attempt.errorCode}` : ""}
        </li>
      ))}
    </ol>
  );
}
