export default function Loading() {
  return <main className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6" aria-busy="true">
    <div className="h-16 w-80 animate-pulse rounded-xl bg-violet-100" />
    <div className="h-28 animate-pulse rounded-2xl bg-violet-100" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((n) => <div key={n} className="h-28 animate-pulse rounded-2xl bg-violet-100" />)}</div>
    <div className="h-64 animate-pulse rounded-2xl bg-violet-100" />
  </main>;
}
