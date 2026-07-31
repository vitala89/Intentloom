const subjectPattern =
  /^(feat|fix|docs|chore|refactor|test|build|ci|perf|revert|release|security)(\([a-z0-9][a-z0-9._/-]*\))?(!)?:\s+\S.+$/;

export function validateCommitMessage(message, label = "commit") {
  const subject = message.split(/\r?\n/, 1)[0].trimEnd();
  const errors = [];
  const isGeneratedMerge = subject.startsWith("Merge ");
  const isGeneratedRevert = subject.startsWith('Revert "');

  if (!subject) errors.push(`${label}: subject is empty`);
  if (subject.length > 120) {
    errors.push(`${label}: subject exceeds 120 characters`);
  }
  if (
    !isGeneratedMerge &&
    !isGeneratedRevert &&
    !subjectPattern.test(subject)
  ) {
    errors.push(
      `${label}: use <type>(<scope>): <summary> with a supported Conventional Commit type`,
    );
  }
  if (/co-authored-by\s*:/i.test(message)) {
    errors.push(`${label}: Co-Authored-By trailers are not allowed`);
  }
  if (
    /generated\s*(with|by)\s+/i.test(message) ||
    /made\s+with\s+/i.test(message)
  ) {
    errors.push(`${label}: generated-with attribution is not allowed`);
  }
  return errors;
}
