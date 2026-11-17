export function DemoDataNotice() {
  return (
    <aside
      role="note"
      aria-label="Demo data notice"
      className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
    >
      <p>
        <strong>Demo data only.</strong> Records shown here are illustrative;
        actions are simulated and do not update the company database. Do not
        use these records for business decisions.
      </p>
    </aside>
  );
}
