import { LuChevronRight, LuInfo } from "react-icons/lu";
export default function PayrollStatusCards({
  counts,
  onContinue,
}: {
  counts: number[];
  onContinue: () => void;
}) {
  const total = counts.reduce((a, b) => a + b, 0);
  const colors = ["#6D28D9", "#C4B5FD", "#B7B7D1"];
  const names = ["Processed", "In Progress", "Pending"];
  return (
    <section className="rounded-2xl border border-[#edeaf6] bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-1 text-lg font-bold">
        Payroll Status{" "}
        <span
          tabIndex={0}
          title="Processing progress for the selected payroll batch. The center percentage represents processed employee records."
        >
          <LuInfo size={15} />
        </span>
      </h2>
      <div className="mt-4 flex flex-wrap items-center justify-around gap-5">
        <div className="relative h-40 w-40 shrink-0">
          <svg
            viewBox="0 0 120 120"
            className="h-full w-full -rotate-90"
            aria-label="Payroll processing progress"
          >
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="none"
              stroke="#f1edf8"
              strokeWidth="16"
            />
            {counts.map((n, i) => {
              const pct = total ? n / total : 0;
              const start = total
                ? counts.slice(0, i).reduce((a, b) => a + b, 0) / total
                : 0;
              return (
                <circle
                  key={names[i]}
                  cx="60"
                  cy="60"
                  r="48"
                  fill="none"
                  stroke={colors[i]}
                  strokeWidth="16"
                  strokeDasharray={`${pct * 301.59} ${301.59 - pct * 301.59}`}
                  strokeDashoffset={-start * 301.59}
                  tabIndex={0}
                >
                  <title>{`${names[i]}: ${n.toLocaleString()} (${(pct * 100).toFixed(1)}%)`}</title>
                </circle>
              );
            })}
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <strong className="text-3xl">
              {total ? Math.round((counts[0] / total) * 100) : 0}%
            </strong>
            <span className="text-xs font-semibold">In Progress</span>
          </div>
        </div>
        <div className="min-w-[220px] flex-1 space-y-3">
          {names.map((name, i) => (
            <div key={name} className="flex items-center gap-2 text-sm">
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: colors[i] }}
              />
              <span>
                {name} ({counts[i].toLocaleString()})
              </span>
              <strong className="ml-auto">
                {total ? ((counts[i] / total) * 100).toFixed(1) : "0.0"}%
              </strong>
            </div>
          ))}
          <button
            onClick={onContinue}
            className="flex w-full items-center justify-center rounded-lg border border-violet-500 px-3 py-2 text-sm font-bold text-violet-700 hover:bg-violet-50"
          >
            Continue Processing <LuChevronRight />
          </button>
        </div>
      </div>
    </section>
  );
}
