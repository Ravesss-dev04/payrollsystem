import { LuFilePenLine, LuPlus } from "react-icons/lu";
import type { AttendanceCorrection } from "../attendance-management/detail-data";
import { formatDate } from "../attendance-management/detail-data";

export default function AttendanceCorrectionRequests({
  correction,
  onRequest,
  onView,
}: {
  correction?: AttendanceCorrection;
  onRequest: () => void;
  onView: () => void;
}) {
  return (
    <section className="rounded-2xl border border-[#edeaf6] bg-white p-4 shadow-[0_3px_8px_rgba(62,32,120,.08)]">
      <h2 className="text-base font-bold">Correction Requests</h2>
      {correction ? (
        <button
          type="button"
          onClick={onView}
          className="mt-3 w-full rounded-xl bg-[#faf9ff] p-3 text-left hover:bg-violet-50"
        >
          <div className="flex gap-2">
            <LuFilePenLine className="mt-0.5 text-violet-600" size={18} />
            <div className="text-xs">
              <strong className="block">{correction.type} Correction</strong>
              <span className="mt-1 block text-[#73718a]">
                {formatDate(correction.submittedAt)} · Original{" "}
                {correction.originalValue}
              </span>
              <span className="block text-[#73718a]">
                Requested {correction.requestedValue}
              </span>
              <span className="mt-2 inline-block rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                {correction.status}
              </span>
            </div>
          </div>
        </button>
      ) : (
        <p className="mt-4 text-sm text-[#73718a]">
          No correction requests for this attendance record.
        </p>
      )}
      <button
        type="button"
        onClick={onRequest}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-300 px-3 py-2.5 text-sm font-bold text-violet-700 hover:bg-violet-50"
      >
        <LuPlus size={17} />
        Request Attendance Correction
      </button>
    </section>
  );
}
