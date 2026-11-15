"use client";
import { useEffect, useId, useRef } from "react";
import { LuX } from "react-icons/lu";
export const primary =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6D28D9] disabled:opacity-50";
export const secondary =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#EDEAF6] bg-white px-4 py-2 text-sm font-semibold text-[#403B57] hover:bg-purple-50";
export const input =
  "w-full min-w-0 rounded-lg border border-[#E5E1F0] bg-white px-3 py-2.5 text-sm text-[#17152D] outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-100 disabled:bg-gray-50";
export const card =
  "rounded-2xl border border-[#EDEAF6] bg-white p-5 shadow-sm sm:p-6";
export function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  wide = false,
  icon,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  icon?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const previous = document.activeElement as HTMLElement;
    el.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      el.close();
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby={titleId}
      className={`m-auto max-h-[90dvh] w-[calc(100%-2rem)] ${wide ? "max-w-3xl" : "max-w-xl"} overflow-hidden rounded-2xl bg-white p-0 text-[#17152D] shadow-2xl backdrop:bg-[#17152D]/60`}
    >
      <div className="flex max-h-[90dvh] flex-col">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#EDEAF6] p-5">
          <div className="flex items-start gap-3">
            {icon && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3E8FF] text-[#7C3AED]">{icon}</span>}
            <div><h2 id={titleId} className="text-lg font-bold">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-[#73718A]">{description}</p>
            )}
            </div></div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 hover:bg-purple-50"
          >
            <LuX size={20} />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[#EDEAF6] p-4">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
export function Discard({
  onKeep,
  onDiscard,
}: {
  onKeep: () => void;
  onDiscard: () => void;
}) {
  return (
    <Modal
      title="Discard Unsaved Changes?"
      description="You have unsaved changes. Leaving now will discard them."
      onClose={onKeep}
      footer={
        <>
          <button className={secondary} onClick={onKeep}>
            Keep Editing
          </button>
          <button className={primary} onClick={onDiscard}>
            Discard Changes
          </button>
        </>
      }
    >
      <p className="text-sm text-[#73718A]">
        Your saved preferences will remain unchanged.
      </p>
    </Modal>
  );
}
