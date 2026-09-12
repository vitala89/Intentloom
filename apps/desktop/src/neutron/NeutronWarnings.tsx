export interface NeutronWarningsProps {
  readonly warnings: readonly string[];
}

export function NeutronWarnings({ warnings }: NeutronWarningsProps) {
  if (warnings.length === 0) return null;
  return (
    <section aria-label="Structured warnings">
      <h3 className="neutron-evidence-heading">Warnings</h3>
      <ul>
        {warnings.map((warning) => (
          <li key={warning} role="status">
            {warning}
          </li>
        ))}
      </ul>
    </section>
  );
}
