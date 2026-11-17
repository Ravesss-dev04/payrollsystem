export function DashboardUnavailableState({
  title,
  message,
  role = "status",
}: {
  title: string;
  message: string;
  role?: "status" | "alert";
}) {
  return (
    <div
      role={role}
      className="mt-3 rounded-lg border border-[#EDEAF6] bg-[#FAF9FE] p-3"
    >
      <p className="text-sm font-semibold text-[#302B48]">{title}</p>
      <p className="mt-1 text-xs text-[#73718A]">{message}</p>
    </div>
  );
}
