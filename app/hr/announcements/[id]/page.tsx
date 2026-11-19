"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  LuArchive,
  LuArrowLeft,
  LuCalendarDays,
  LuCheck,
  LuCircleCheck,
  LuClock3,
  LuDownload,
  LuEllipsisVertical,
  LuFileText,
  LuMegaphone,
  LuPaperclip,
  LuTag,
  LuUsersRound,
} from "react-icons/lu";

type Status = "published" | "scheduled" | "draft" | "archived";
type Attachment = { id: string; name: string; size: number; local?: boolean };
type RecordItem = {
  id: string;
  title: string;
  audience: string;
  content: string;
  status: Status;
  date: string;
  createdAt: string;
  attachments: Attachment[];
};

const fallback: RecordItem = {
  id: "demo-1",
  title: "2025 Benefits Enrollment Is Now Open",
  audience: "All Employees",
  content: "Company announcement for the WorkPulse team.",
  status: "published",
  date: "2025-01-28T09:00:00+08:00",
  createdAt: "2025-01-15T09:00:00+08:00",
  attachments: [],
};

function plain(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim();
}

function safeContent(value: string) {
  if (typeof window === "undefined") return plain(value);
  const doc = new DOMParser().parseFromString(value, "text/html");
  const clean = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const element = node as HTMLElement;
    const children = Array.from(element.childNodes).map(clean).join("");
    const tag = element.tagName.toLowerCase();
    if (tag === "br") return "<br />";
    if (tag === "a") {
      const href = element.getAttribute("href") || "";
      try {
        const url = new URL(href);
        if (["http:", "https:", "mailto:"].includes(url.protocol)) return `<a href="${url.href.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer">${children}</a>`;
      } catch {}
      return children;
    }
    return ["b", "strong", "i", "em", "u", "ul", "ol", "li", "p", "div"].includes(tag) ? `<${tag}>${children}</${tag}>` : children;
  };
  return Array.from(doc.body.childNodes).map(clean).join("");
}

function dateLabel(value: string) {
  return value
    ? new Date(value).toLocaleString("en-US", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Not set";
}

function StatusBadge({ status }: { status: Status }) {
  const style = {
    published: "bg-emerald-100 text-emerald-700",
    scheduled: "bg-violet-100 text-violet-700",
    draft: "bg-slate-100 text-slate-600",
    archived: "bg-slate-100 text-slate-500",
  }[status];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold capitalize ${style}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {status}
    </span>
  );
}

export default function AnnouncementDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [record] = useState<RecordItem | null>(() => {
    if (typeof window === "undefined") return params.id === fallback.id ? fallback : null;
    const stored = window.localStorage.getItem("workpulse-announcements");
    const records = stored ? (JSON.parse(stored) as RecordItem[]) : [];
    return records.find((item) => item.id === params.id) || (params.id === fallback.id ? fallback : null);
  });

  const subtitle = useMemo(() => {
    if (!record) return "Review announcement information and publication status.";
    const text = plain(record.content);
    return text.length > 130 ? `${text.slice(0, 127)}...` : text || "Company announcement for the WorkPulse team.";
  }, [record]);

  if (!record) {
    return <main className="flex-1 overflow-y-auto p-6"><div className="mx-auto max-w-5xl rounded-2xl border border-violet-100 bg-white p-8 text-center shadow-sm"><p className="text-sm text-[#73718A]">This announcement is no longer available in the current demo.</p><button onClick={() => router.push("/hr/announcements")} className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white">Back to Announcements</button></div></main>;
  }

  const publishedLabel = record.status === "scheduled" ? "Scheduled" : record.status === "published" ? "Published" : "Last updated";

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-[#f7f5fd] px-4 py-5 text-[#17152D] sm:px-6 sm:py-7 [scrollbar-color:#c6b5df_transparent] [scrollbar-width:thin]">
      <div className="mx-auto max-w-[1500px]">
        <button onClick={() => router.push("/hr/announcements")} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-900">
          <LuArrowLeft size={18} /> Back to Announcements
        </button>

        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><LuMegaphone size={25} /></span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight sm:text-[30px]">{record.title || "Untitled draft"}</h1>
              <p className="mt-1 max-w-3xl text-sm text-[#73718A]">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3"><StatusBadge status={record.status} /><button aria-label="More announcement actions" className="rounded-lg border border-violet-100 bg-white p-3 text-[#73718A] shadow-sm"><LuEllipsisVertical /></button></div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.75fr)_minmax(300px,.95fr)]">
          <div className="min-w-0 space-y-4">
            <section className="relative min-h-[185px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#32139d] via-[#6931e2] to-[#c18cff] p-6 text-white shadow-[0_8px_24px_rgba(74,39,173,.22)] sm:min-h-[225px] sm:p-10">
              <div className="relative z-10 max-w-[60%]"><p className="text-3xl font-extrabold leading-tight sm:text-5xl">{record.title.split(" ").slice(0, 4).join(" ")}</p><p className="mt-2 text-2xl font-bold leading-tight text-violet-100 sm:text-4xl">{record.title.split(" ").slice(4).join(" ") || "Announcement"}</p><span className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-violet-800">{record.status === "published" ? "Now available" : record.status}</span></div>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 sm:right-14"><div className="relative grid h-28 w-24 rotate-6 place-items-center rounded-xl border-8 border-white bg-violet-50 shadow-2xl sm:h-40 sm:w-32"><LuCheck className="absolute left-2 top-3 text-violet-600" size={28} /><LuCheck className="absolute left-2 top-12 text-violet-600" size={28} /><LuCheck className="absolute left-2 top-[76px] text-violet-600 sm:top-24" size={28} /><div className="h-1 w-12 bg-violet-300 sm:w-20" /><div className="absolute -bottom-5 -right-8 grid h-16 w-14 place-items-center rounded-xl bg-[#4320b8] text-white shadow-lg"><LuFileText size={30} /></div></div></div>
              <div className="absolute -bottom-16 right-1/3 h-40 w-40 rounded-full bg-fuchsia-300/20 blur-2xl" />
            </section>

            <div className="grid gap-3 sm:grid-cols-3">
              <InfoCard icon={record.status === "published" ? LuCircleCheck : LuCalendarDays} label={publishedLabel} value={dateLabel(record.date)} />
              <InfoCard icon={LuUsersRound} label="Audience" value={record.audience} />
              <InfoCard icon={LuTag} label="Category" value="Announcement" />
            </div>

            <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-bold">Announcement Details</h2><div className="prose prose-sm mt-2 max-w-none text-[#4c4864] [&_a]:text-violet-700 [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: safeContent(record.content) }} /></section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Engagement</h2><div className="mt-5 grid grid-cols-2 divide-x divide-violet-100"><Metric icon={LuMegaphone} value="—" label="Views recorded" /><Metric icon={LuCheck} value="—" label="Acknowledgements" /></div><p className="mt-4 text-xs text-[#8b869d]">Engagement metrics are not recorded in this demo.</p></section>
            <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Attachments ({record.attachments.length})</h2><div className="mt-4 space-y-3">{record.attachments.length ? record.attachments.map((attachment) => <div key={attachment.id} className="flex items-center gap-3 rounded-xl bg-violet-50 px-3 py-3 text-sm"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-100 text-violet-700"><LuPaperclip size={17} /></span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{attachment.name}</p><p className="text-xs text-[#73718A]">{Math.round(attachment.size / 1024)} KB · {attachment.local ? "Local selection" : "Demo metadata"}</p></div>{attachment.local ? null : <button aria-label={`Download ${attachment.name}`} className="text-violet-700"><LuDownload size={17} /></button>}</div>) : <p className="text-sm text-[#73718A]">No attachments</p>}</div></section>
            <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Publication record</h2><div className="mt-4 space-y-3 text-sm"><DetailRow icon={LuCalendarDays} label="Created" value={dateLabel(record.createdAt)} /><DetailRow icon={LuClock3} label="Timezone" value="Asia/Manila" /><DetailRow icon={LuArchive} label="Status" value={record.status} /></div></section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: typeof LuCalendarDays; label: string; value: string }) { return <div className="rounded-xl border border-violet-100 bg-white p-3 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-100 text-violet-700"><Icon size={18} /></span><div className="min-w-0"><p className="text-xs text-[#73718A]">{label}</p><p className="truncate text-sm font-bold">{value}</p></div></div></div>; }
function Metric({ icon: Icon, value, label }: { icon: typeof LuMegaphone; value: string; label: string }) { return <div className="flex items-center gap-3 px-2"><span className="grid h-10 w-10 place-items-center rounded-full bg-violet-100 text-violet-700"><Icon size={20} /></span><div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-[#73718A]">{label}</p></div></div>; }
function DetailRow({ icon: Icon, label, value }: { icon: typeof LuCalendarDays; label: string; value: string }) { return <div className="flex items-center gap-3"><Icon className="text-violet-600" size={17} /><div><p className="text-xs text-[#73718A]">{label}</p><p className="font-semibold capitalize">{value}</p></div></div>; }
