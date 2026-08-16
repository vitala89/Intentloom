export function documentConcept(path: string): string | null {
  const lower = path.replaceAll("\\", "/").toLowerCase();
  const segments = lower.split("/").filter(Boolean);
  const name = segments.at(-1);
  if (name === undefined) return null;
  if (name === "readme.md") return readmeConcept(segments);
  if (name === "changelog.md") return "change-history";
  if (
    name === "roadmap.md" ||
    /(?:product[-_ ]?(?:state|roadmap)|state[-_ ]?of[-_ ]?product)/u.test(name)
  )
    return "product-state";
  if (/(?:architecture|architectural|adr)/u.test(name)) return "architecture";
  if (/(?:technical[-_ ]?debt|tech[-_ ]?debt)/u.test(name))
    return "technical-debt";
  return null;
}

function readmeConcept(segments: readonly string[]): string | null {
  if (segments.length === 1) return "public-readme";
  if (segments.length === 2 && segments[0] === "docs")
    return "documentation-index";
  return null;
}
