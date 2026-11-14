"use client";
import { useEffect, useRef, useState } from "react";
import { LuArrowRight, LuWallet } from "react-icons/lu";
import type { PendingApproval } from "../../dashboard/types";
export default function PendingApprovalsList({
  approvals,
}: {
  approvals: PendingApproval[];
}) {
  const [selected, setSelected] = useState<PendingApproval | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
  }, [selected]);
  return (
    <section className="rounded-2xl border border-[#EDEAF6] bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold">
        Pending Approvals ({approvals.length})
      </h2>
      <ul className="mt-3">
        {approvals.map((item) => (
          <li
            key={item.title}
            className="flex items-center gap-3 border-t border-[#EDEAF6] py-3"
          >
            <span className="rounded-full bg-[#F3E8FF] p-2 text-[#7C3AED]">
              <LuWallet size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-xs text-[#73718A]">{item.description}</p>
            </div>
            <button
              onClick={() => setSelected(item)}
              className="flex items-center gap-1 rounded-lg bg-[#7C3AED] px-3 py-2 text-xs font-semibold text-white hover:bg-[#6D28D9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
            >
              Review <LuArrowRight aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialog}
        onClose={() => setSelected(null)}
        aria-labelledby="approval-title"
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-6 text-[#17152D] shadow-xl backdrop:bg-black/50"
      >
        <h2 id="approval-title" className="text-lg font-bold">
          {selected?.type} approval
        </h2>
        <p className="mt-2 text-sm text-[#73718A]">Read-only dummy preview</p>
        <p className="mt-5 font-semibold">{selected?.title}</p>
        <p className="mt-2 text-sm">{selected?.description}</p>
        <p className="mt-2 text-sm">Status: {selected?.status}</p>
        <button
          onClick={() => dialog.current?.close()}
          className="mt-6 rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
        >
          Close
        </button>
      </dialog>
    </section>
  );
}
