import { useCallback, useState } from "react";
import type {
  InceptionViewmodelPayload,
  VersionedInceptionSession,
} from "@intentloom/protocol";
import { Card } from "../design/components/layout/Card.js";
import { Button } from "../design/components/core/Button.js";
import { EmptyState } from "../design/components/states/EmptyState.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import { TextInput } from "../design/components/forms/TextInput.js";
import { desktopClient, DesktopBridgeError } from "../desktop-client.js";

export type InceptionClientSurfaceState =
  "empty" | "loading" | "ready" | "error" | "resume" | "deleted";

interface InceptionQuestionRow {
  readonly id: string;
  readonly prompt: string;
  readonly required: boolean;
  readonly answered: boolean;
  readonly answerValue?: string;
  readonly confidence?: string;
}

interface InceptionSessionProgress {
  readonly sessionId: string;
  readonly root: string;
  readonly idea: string;
  readonly status: string;
  readonly totalQuestions: number;
  readonly answeredQuestions: number;
  readonly pendingQuestions: number;
  readonly progressPercent: number;
  readonly questions: readonly InceptionQuestionRow[];
}

export interface NewProjectViewProps {
  readonly resumedSessionId?: string | null;
}

function extractSessionViewmodel(
  payload: InceptionViewmodelPayload,
): VersionedInceptionSession {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("session" in payload) ||
    !("retention" in payload) ||
    !("schemaVersion" in payload)
  ) {
    throw new Error("Invalid inception session viewmodel");
  }
  return payload as unknown as VersionedInceptionSession;
}

function buildProgress(
  session: VersionedInceptionSession,
): InceptionSessionProgress {
  const answeredByQuestion = new Map(
    session.session.answers.map((answer) => [answer.questionId, answer]),
  );
  const totalQuestions = session.session.questions.length;
  const answeredQuestions = session.session.answers.length;
  const pendingQuestions = totalQuestions - answeredQuestions;
  const progressPercent =
    totalQuestions <= 0
      ? 0
      : Math.round((answeredQuestions / totalQuestions) * 100);

  return {
    sessionId: session.session.id,
    root: session.session.root,
    idea: session.session.idea,
    status: session.session.status,
    totalQuestions,
    answeredQuestions,
    pendingQuestions,
    progressPercent,
    questions: session.session.questions.map((question) => {
      const answer = answeredByQuestion.get(question.id);
      return {
        id: question.id,
        prompt: question.prompt,
        required: question.required,
        answered: answer !== undefined,
        ...(answer?.value !== undefined ? { answerValue: answer.value } : {}),
        ...(answer?.confidence !== undefined
          ? { confidence: answer.confidence }
          : {}),
      } satisfies InceptionQuestionRow;
    }),
  };
}

export function NewProjectView({ resumedSessionId }: NewProjectViewProps) {
  const [surfaceState, setSurfaceState] =
    useState<InceptionClientSurfaceState>("empty");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [idea, setIdea] = useState("");
  const [targetRoot, setTargetRoot] = useState("");
  const [resumeId, setResumeId] = useState(resumedSessionId ?? "");
  const [progress, setProgress] = useState<InceptionSessionProgress | null>(
    null,
  );

  const loadSession = useCallback(async (sessionId: string) => {
    setSurfaceState("loading");
    setErrorMessage(null);
    try {
      const viewmodel = await desktopClient.inceptionSessionGet(sessionId);
      setProgress(buildProgress(extractSessionViewmodel(viewmodel)));
      setSurfaceState("ready");
    } catch (error) {
      setSurfaceState("error");
      setProgress(null);
      setErrorMessage(
        error instanceof DesktopBridgeError
          ? error.message
          : "Could not load the inception session.",
      );
    }
  }, []);

  async function startSession() {
    if (!idea.trim() || !targetRoot.trim()) {
      setErrorMessage("Idea and target root are required to start.");
      setSurfaceState("error");
      return;
    }
    setSurfaceState("loading");
    setErrorMessage(null);
    try {
      const viewmodel = await desktopClient.inceptionSessionCreate(
        targetRoot.trim(),
        idea.trim(),
      );
      const parsed = extractSessionViewmodel(viewmodel);
      setResumeId(parsed.session.id);
      setProgress(buildProgress(parsed));
      setSurfaceState("ready");
    } catch (error) {
      setSurfaceState("error");
      setProgress(null);
      setErrorMessage(
        error instanceof DesktopBridgeError
          ? error.message
          : "Could not create the inception session.",
      );
    }
  }

  async function resumeSession() {
    const sessionId = resumeId.trim();
    if (!sessionId) {
      setErrorMessage("Enter a session id to resume.");
      setSurfaceState("error");
      return;
    }
    setSurfaceState("resume");
    await loadSession(sessionId);
  }

  async function deleteSession() {
    if (!progress) return;
    setSurfaceState("loading");
    setErrorMessage(null);
    try {
      await desktopClient.inceptionSessionDelete(progress.sessionId);
      setProgress(null);
      setSurfaceState("deleted");
    } catch (error) {
      setSurfaceState("error");
      setErrorMessage(
        error instanceof DesktopBridgeError
          ? error.message
          : "Could not delete the inception session.",
      );
    }
  }

  if (surfaceState === "deleted") {
    return (
      <EmptyState
        icon="trash-2"
        title="Session deleted"
        description="The inception session was removed without writing project files."
        action={
          <Button variant="primary" onClick={() => setSurfaceState("empty")}>
            Start another session
          </Button>
        }
      />
    );
  }

  if (surfaceState === "loading" || surfaceState === "resume") {
    return (
      <EmptyState
        icon="loader"
        title={
          surfaceState === "resume"
            ? "Resuming inception session"
            : "Starting inception session"
        }
        description="Reading session state from the local daemon."
        compact
      />
    );
  }

  if (surfaceState === "error") {
    return (
      <EmptyState
        icon="circle-alert"
        title="Inception session unavailable"
        description={errorMessage ?? "An unexpected error occurred."}
        action={
          <Button variant="secondary" onClick={() => setSurfaceState("empty")}>
            Back to start
          </Button>
        }
      />
    );
  }

  if (progress) {
    const tone = progress.pendingQuestions === 0 ? "success" : "neutral";

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-5)",
        }}
      >
        <Card variant="raised">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "var(--space-4)",
              alignItems: "flex-start",
            }}
          >
            <div>
              <span className="hero-kicker">Inception session</span>
              <h2 style={{ marginTop: "var(--space-2)" }}>{progress.idea}</h2>
              <p style={{ color: "var(--text-secondary)" }}>
                Target root: <code>{progress.root}</code>
              </p>
            </div>
            <StatusChip tone={tone} label={progress.status} size="sm" />
          </div>
          <p style={{ marginTop: "var(--space-4)" }}>
            {progress.answeredQuestions} of {progress.totalQuestions} questions
            answered ({progress.progressPercent}%)
          </p>
        </Card>

        <Card variant="default">
          <h3 style={{ marginBottom: "var(--space-4)" }}>
            Discovery questions
          </h3>
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            {progress.questions.map((question) => (
              <li key={question.id}>
                <strong>{question.prompt}</strong>
                <div style={{ color: "var(--text-secondary)" }}>
                  {question.answered
                    ? `${question.answerValue} (${question.confidence})`
                    : question.required
                      ? "Required — pending"
                      : "Optional — pending"}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <Button variant="secondary" onClick={() => void deleteSession()}>
            Delete session
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setProgress(null);
              setSurfaceState("empty");
            }}
          >
            Start new session
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5)",
      }}
    >
      <Card variant="raised" className="hero-panel">
        <div className="hero-copy">
          <span className="hero-kicker">New project</span>
          <h2>Start a new project</h2>
          <p>
            Describe your idea and answer discovery questions before any files
            are created.
          </p>
        </div>
      </Card>

      <Card variant="default">
        <div
          style={{
            display: "grid",
            gap: "var(--space-4)",
            maxWidth: 640,
          }}
        >
          <TextInput
            label="Project idea"
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            placeholder="Describe what you want to build"
          />
          <TextInput
            label="Target root path"
            value={targetRoot}
            onChange={(event) => setTargetRoot(event.target.value)}
            placeholder="/path/to/new-project"
          />
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <Button variant="primary" onClick={() => void startSession()}>
              Start discovery session
            </Button>
          </div>
        </div>
      </Card>

      <Card variant="default">
        <h3 style={{ marginBottom: "var(--space-3)" }}>
          Resume an existing session
        </h3>
        <div
          style={{
            display: "grid",
            gap: "var(--space-3)",
            maxWidth: 640,
          }}
        >
          <TextInput
            label="Session id"
            value={resumeId}
            onChange={(event) => setResumeId(event.target.value)}
            placeholder="inc_..."
          />
          <Button variant="secondary" onClick={() => void resumeSession()}>
            Resume session
          </Button>
        </div>
      </Card>
    </div>
  );
}
