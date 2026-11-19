"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LuArchive,
  LuBell,
  LuBold,
  LuCalendarDays,
  LuCircleCheck,
  LuClock,
  LuEllipsis,
  LuEye,
  LuFileText,
  LuItalic,
  LuLayers,
  LuLink,
  LuList,
  LuListOrdered,
  LuMegaphone,
  LuPaperclip,
  LuPencil,
  LuPlus,
  LuRocket,
  LuSearch,
  LuStar,
  LuUnderline,
  LuX,
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
  icon: number;
};
type Form = {
  title: string;
  audience: string;
  content: string;
  schedule: boolean;
  date: string;
  time: string;
  attachments: Attachment[];
};
const fixture = (
  id: number,
  title: string,
  status: Status,
  date: string,
  audience = "All Employees",
  icon = 0,
): RecordItem => ({
  id: `demo-${id}`,
  title,
  status,
  date,
  audience,
  icon,
  content: "Company announcement for the WorkPulse team.",
  createdAt: "2025-01-15T09:00:00+08:00",
  attachments: [],
});
const initial: RecordItem[] = [
  fixture(
    1,
    "2025 Benefits Enrollment Is Now Open",
    "published",
    "2025-01-28T09:00:00+08:00",
  ),
  fixture(
    2,
    "Company Townhall — Q1 2025",
    "scheduled",
    "2025-02-05T10:00:00+08:00",
    "All Employees",
    1,
  ),
  fixture(
    3,
    "Updated Remote Work Policy",
    "published",
    "2025-01-30T14:00:00+08:00",
    "Managers",
    2,
  ),
  fixture(
    4,
    "Office Holiday Schedule (2025)",
    "published",
    "2025-01-20T09:00:00+08:00",
    "All Employees",
    3,
  ),
  fixture(
    5,
    "New HR Self-Service Features",
    "draft",
    "2025-02-10T09:00:00+08:00",
    "All Employees",
    4,
  ),
  ...Array.from({ length: 13 }, (_, i) =>
    fixture(
      6 + i,
      [
        "Employee Wellness Program",
        "Learning and Development Updates",
        "Team Recognition",
        "Workplace Safety Reminder",
        "Payroll Calendar Update",
        "New Employee Welcome",
        "Company Values in Action",
        "Annual Health Check",
        "Office Operations Update",
        "Community Volunteer Day",
        "Employee Resources",
        "Security Awareness",
        "Quarterly Company Update",
      ][i],
      "published",
      "2025-01-15T09:00:00+08:00",
    ),
  ),
  ...Array.from({ length: 3 }, (_, i) =>
    fixture(
      19 + i,
      ["Leadership Forum", "Team Planning Session", "Company Update"][i],
      "scheduled",
      "2025-03-01T09:00:00+08:00",
    ),
  ),
  fixture(22, "Employee Handbook Updates", "draft", ""),
  fixture(23, "Upcoming Team Activities", "draft", ""),
  fixture(
    24,
    "Previous Office Notice",
    "archived",
    "2025-01-01T09:00:00+08:00",
  ),
];
const empty: Form = {
  title: "",
  audience: "All Employees",
  content: "",
  schedule: false,
  date: "",
  time: "",
  attachments: [],
};
const demo: Form = {
  title: "Q1 2025 Company Townhall — Save the Date!",
  audience: "All Employees",
  content:
    "Join us for our Q1 2025 Company Townhall, where we'll share key updates, upcoming initiatives, and answer your questions live.",
  schedule: true,
  date: "2025-02-05",
  time: "10:00",
  attachments: [
    { id: "fixture", name: "Q1_Townhall_Agenda.pdf", size: 456 * 1024 },
  ],
};
void demo;
const tabs: { key: Status | "all"; label: string; icon: typeof LuLayers }[] = [
  { key: "all", label: "All", icon: LuLayers },
  { key: "published", label: "Published", icon: LuCircleCheck },
  { key: "scheduled", label: "Scheduled", icon: LuClock },
  { key: "draft", label: "Drafts", icon: LuFileText },
  { key: "archived", label: "Archived", icon: LuArchive },
];
const input =
  "w-full rounded-lg border border-[#ded8ed] bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100";
const primary =
  "rounded-lg bg-[#7C3AED] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#6D28D9]";
const secondary =
  "rounded-lg border border-violet-300 bg-white px-4 py-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-50";
function formatDate(value: string) {
  return value
    ? new Date(value).toLocaleString("en-US", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";
}
function plain(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();
}
// Retain only simple formatting and safe links from the editable surface.
function sanitize(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const clean = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE)
      return (node.textContent || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as HTMLElement;
    const children = Array.from(el.childNodes).map(clean).join("");
    const tag = el.tagName.toLowerCase();
    if (tag === "br") return "<br>";
    if (tag === "a") {
      const href = el.getAttribute("href") || "";
      try {
        const u = new URL(href);
        if (["http:", "https:", "mailto:"].includes(u.protocol))
          return `<a href="${u.href.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer">${children}</a>`;
      } catch {}
      return children;
    }
    return [
      "b",
      "strong",
      "i",
      "em",
      "u",
      "ul",
      "ol",
      "li",
      "p",
      "div",
    ].includes(tag)
      ? `<${tag}>${children}</${tag}>`
      : children;
  };
  return Array.from(doc.body.childNodes).map(clean).join("");
}
function Badge({ status }: { status: Status }) {
  const colors = {
    published: "bg-emerald-100 text-emerald-700",
    scheduled: "bg-violet-100 text-violet-700",
    draft: "bg-slate-100 text-slate-600",
    archived: "bg-slate-100 text-slate-500",
  };
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-semibold capitalize ${colors[status]}`}
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-current" />
      {status}
    </span>
  );
}
function Modal({
  title,
  subtitle,
  icon: Icon = LuFileText,
  maxWidth = "max-w-lg",
  children,
  onClose,
  footer,
}: {
  title: string;
  subtitle?: string;
  icon?: typeof LuFileText;
  maxWidth?: string;
  children: React.ReactNode;
  onClose: () => void;
  footer: React.ReactNode;
}) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const dialog = document.querySelector(`[aria-labelledby="${title.replace(/\s+/g, "-")}-title"]`) as HTMLElement | null;
    const focusable = dialog?.querySelectorAll<HTMLElement>("button, input, select, textarea, [contenteditable='true'], [tabindex]:not([tabindex='-1'])");
    focusable?.[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
      if (event.key === "Tab" && focusable?.length) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [title]);
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#17152d]/55 p-3 sm:p-6"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${title.replace(/\s+/g, "-")}-title`}
        className={`flex max-h-[90dvh] w-full ${maxWidth} min-h-0 flex-col overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-[0_24px_80px_rgba(42,24,85,.24)]`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between border-b border-violet-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700">
              <Icon size={21} />
            </span>
            <div>
              <h2 id={`${title.replace(/\s+/g, "-")}-title`} className="font-bold text-[#282442]">{title}</h2>
              {subtitle && <p className="mt-0.5 text-xs text-[#73718A]">{subtitle}</p>}
            </div>
          </div>
          <button className="rounded-lg p-2 text-[#73718A] hover:bg-violet-50 hover:text-violet-700" aria-label={`Close ${title}`} onClick={onClose}>
            <LuX size={19} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 text-sm [scrollbar-color:#c6b5df_transparent] [scrollbar-width:thin] sm:p-6">{children}</div>
        <footer className="flex shrink-0 justify-end gap-2 border-t border-violet-100 bg-white p-4 sm:p-5">
          {footer}
        </footer>
      </section>
    </div>
  );
}
export default function AnnouncementsPage() {
  const [records, setRecords] = useState(initial);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState<Form>(empty);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [menu, setMenu] = useState<string | null>(null);
  const [view, setView] = useState<RecordItem | null>(null);
  const [confirm, setConfirm] = useState<{
    kind: string;
    item?: RecordItem;
    intent?: "schedule" | "publish";
  } | null>(null);
  const [toast, setToast] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const editor = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);
  useEffect(() => {
    document.body.style.overflow = open || confirm || linkOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, confirm, linkOpen]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  const filtered = records.filter(
    (r) =>
      (filter === "all" || r.status === filter) &&
      `${r.title} ${r.audience} ${plain(r.content)}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 5));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 5, currentPage * 5);
  const update = (patch: Partial<Form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };
  const load = (item?: RecordItem, duplicate = false, intent?: "schedule" | "publish") => {
    const d = item?.date
      ? new Date(item.date)
          .toLocaleString("sv-SE", { timeZone: "Asia/Manila" })
          .replace(" ", "T")
      : "";
    const next = item
      ? {
          title: duplicate ? `${item.title} (Copy)` : item.title,
          audience: item.audience,
          content: item.content,
          schedule: intent ? intent === "schedule" : !duplicate && item.status === "scheduled",
          date: d.slice(0, 10),
          time: d.slice(11, 16),
          attachments: item.attachments.map((a) => ({ ...a })),
        }
      : empty;
    setForm(next);
    setEditId(item && !duplicate ? item.id : null);
    setOpen(true);
    setDirty(duplicate);
    setErrors([]);
    setMenu(null);
    setTimeout(() => {
      if (editor.current) editor.current.innerHTML = next.content;
      titleRef.current?.focus();
    }, 0);
  };
  const askLoad = (item?: RecordItem, duplicate = false, intent?: "schedule" | "publish") => {
    if (dirty) {
      setConfirm({
        kind: duplicate ? "duplicate" : item ? "edit" : "create",
        item,
        intent,
      });
    } else load(item, duplicate, intent);
  };
  const validate = () => {
    const e: string[] = [];
    if (!form.title.trim()) e.push("Title is required.");
    if (!plain(form.content)) e.push("Content is required.");
    if (!form.audience) e.push("Audience is required.");
    if (form.schedule) {
      const date = new Date(`${form.date}T${form.time}:00+08:00`);
      if (
        !form.date ||
        !form.time ||
        Number.isNaN(date.getTime()) ||
        date.getTime() <= Date.now()
      )
        e.push("Choose a valid future date and time in Asia/Manila.");
    }
    setErrors(e);
    return e.length === 0;
  };
  const save = (status: Status) => {
    const now = new Date().toISOString();
    const date =
      status === "scheduled"
        ? `${form.date}T${form.time}:00+08:00`
        : status === "published"
          ? now
          : "";
    const item: RecordItem = {
      id: editId || `demo-${crypto.randomUUID()}`,
      title: form.title.trim(),
      audience: form.audience,
      content: sanitize(form.content),
      status,
      date,
      createdAt: records.find((r) => r.id === editId)?.createdAt || now,
      attachments: form.attachments,
      icon: 0,
    };
    setRecords((rs) =>
      editId ? rs.map((r) => (r.id === editId ? item : r)) : [item, ...rs],
    );
    setDirty(false);
    setEditId(item.id);
    setConfirm(null);
    setToast(
      status === "draft"
        ? "Draft saved in this demo."
        : status === "scheduled"
          ? "Announcement schedule saved in this demo. No automatic publication is configured."
          : "Announcement marked as published in this demo.",
    );
  };
  const transition = (kind: string, item: RecordItem) => {
    setRecords((rs) =>
      rs.map((r) =>
        r.id === item.id
          ? {
              ...r,
              status: kind === "archive" ? "archived" : "draft",
              date: kind === "cancel" ? "" : r.date,
            }
          : r,
      ),
    );
    setSelected((s) => s.filter((id) => id !== item.id));
    setConfirm(null);
    setToast(
      kind === "archive"
        ? "Announcement moved to the archive."
        : kind === "cancel"
          ? "Schedule cancelled; announcement moved to drafts."
          : "Announcement restored as a draft.",
    );
  };
  const action = (kind: string, item: RecordItem) => {
    setMenu(null);
    if (kind === "View") openDetail(item);
    else if (kind === "Edit" || kind === "Edit Schedule")
      askLoad(item);
    else if (kind === "Schedule") askLoad(item, false, "schedule");
    else if (kind === "Duplicate") askLoad(item, true);
    else if (kind === "Publish Now") {
      askLoad(item, false, "publish");
    } else
      setConfirm({
        kind:
          kind === "Archive"
            ? "archive"
            : kind === "Cancel Schedule"
              ? "cancel"
              : "restore",
        item,
      });
  };
  const router = useRouter();
  const openDetail = (item: RecordItem) => {
    window.localStorage.setItem("workpulse-announcements", JSON.stringify(records));
    router.push(`/hr/announcements/${item.id}`);
  };
  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const good = Array.from(files).filter(
      (f) =>
        /\.(pdf|docx|png|jpe?g)$/i.test(f.name) && f.size <= 10 * 1024 * 1024,
    );
    if (
      good.length !== files.length ||
      form.attachments.length + good.length > 5
    )
      setToast(
        "Use up to 5 PDF, DOCX, PNG or JPG files, each no larger than 10 MB.",
      );
    update({
      attachments: [
        ...form.attachments,
        ...good
          .slice(0, Math.max(0, 5 - form.attachments.length))
          .map((f) => ({
            id: crypto.randomUUID(),
            name: f.name,
            size: f.size,
            local: true,
          })),
      ],
    });
  };
  const toolbar = (command: string) => {
    editor.current?.focus();
    document.execCommand(command, false);
    update({ content: sanitize(editor.current?.innerHTML || "") });
  };
  return (
    <>
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-7 [scrollbar-color:#c6b5df_transparent] [scrollbar-width:thin] sm:px-6">
          <div className="mx-auto max-w-[1600px]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex gap-3">
                <LuMegaphone    
                  className="mt-1 shrink-0 text-violet-600"
                  size={32}
                />
                <div>
                  <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">
                    Announcement Center
                  </h1>
                  <p className="mt-1 text-sm text-[#73718A]">
                    Create, schedule, and manage company announcements and HR
                    communications.
                  </p>
                </div>
              </div>
              <button className={primary} onClick={() => askLoad()}>
                <span className="flex items-center gap-2">
                  <LuPlus size={17} />
                  Create Announcement
                </span>
              </button>
            </div>
            <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => {
                    setFilter(t.key);
                    setPage(1);
                  }}
                  className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-sm ${filter === t.key ? "border-violet-600 bg-violet-600 text-white" : "border-[#e8e2f4] bg-white text-[#282442] hover:bg-violet-50"}`}
                >
                  <t.icon size={15} />
                  {t.label} (
                  {t.key === "all"
                    ? records.length
                    : records.filter((r) => r.status === t.key).length}
                  )

                </button>
                
              ))}
            </div>
            <p className="mb-3 mt-1 text-[11px] text-[#817c99]">
              Historical demonstration fixtures include 2025 dates. Scheduled
              records do not publish automatically.
            </p>
            <div className="grid grid-cols-1 items-start gap-4">
              <section className="min-w-0 overflow-hidden rounded-xl border border-[#edeaf6] bg-white shadow-[0_3px_12px_rgba(77,49,130,.07)]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-violet-50 px-4 py-2">
                  <label className="flex items-center gap-2 text-xs text-[#73718A]">
                    <LuSearch />
                    <input
                      aria-label="Search announcements"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Search announcements"
                      className="w-40 py-1 outline-none"
                    />
                  </label>
                  <div className="flex items-center gap-3 text-xs text-[#73718A]">
                    {selected.length > 0 && (
                      <>
                        <span>{selected.length} selected</span>
                        <button
                          className="text-violet-700"
                          onClick={() => setConfirm({ kind: "bulk" })}
                        >
                          Archive selected
                        </button>
                        <button onClick={() => setSelected([])}>Clear</button>
                      </>
                    )}
                  </div>
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[800px] text-left">
                    <thead className="bg-[#f6f4fb] text-[13px] font-semibold">
                      <tr>
                        <th className="w-10 px-3 py-3">
                          <input
                            aria-label="Select visible announcements"
                            type="checkbox"
                            checked={
                              visible.length > 0 &&
                              visible.every((r) => selected.includes(r.id))
                            }
                            onChange={(e) =>
                              setSelected((s) =>
                                e.target.checked
                                  ? Array.from(
                                      new Set([
                                        ...s,
                                        ...visible.map((r) => r.id),
                                      ]),
                                    )
                                  : s.filter(
                                      (id) => !visible.some((r) => r.id === id),
                                    ),
                              )
                            }
                          />
                        </th>
                        <th>Announcement Title</th>
                        <th>Audience</th>
                        <th>Schedule / Published</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((r) => (
                        <tr
                          key={r.id}
                          className={`border-t border-[#f0edf7] text-sm hover:bg-violet-50/40 ${selected.includes(r.id) ? "bg-violet-50" : ""}`}
                        >
                          <td className="px-3 py-4">
                            <input
                              aria-label={`Select ${r.title}`}
                              type="checkbox"
                              checked={selected.includes(r.id)}
                              onChange={(e) =>
                                setSelected((s) =>
                                  e.target.checked
                                    ? [...s, r.id]
                                    : s.filter((id) => id !== r.id),
                                )
                              }
                            />
                          </td>
                          <td className="max-w-[250px] py-4 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-50 text-lg text-violet-600">
                                {
                                  [
                                    <LuMegaphone key="m" />,
                                    <LuCalendarDays key="c" />,
                                    <LuBell key="b" />,
                                    <LuStar key="s" />,
                                    <LuRocket key="r" />,
                                  ][r.icon]
                                }
                              </span>
                              <span className="font-semibold">
                                {r.title || "Untitled draft"}
                                {r.status === "draft" &&
                                  (!r.title.trim() || !plain(r.content)) && (
                                    <span className="ml-1 text-amber-600">
                                      (Incomplete)
                                    </span>
                                  )}
                              </span>
                            </div>
                          </td>
                          <td className="pr-2">
                            <span className="whitespace-nowrap rounded-md bg-violet-100 px-2.5 py-1.5 text-xs font-semibold text-violet-700">
                              {r.audience}
                            </span>
                          </td>
                          <td className="whitespace-nowrap pr-3 text-[13px]">
                            {formatDate(r.date)}
                          </td>
                          <td>
                            <Badge status={r.status} />
                          </td>
                          <td>
                            <RowActions
                              item={r}
                              menu={menu}
                              setMenu={setMenu}
                              action={action}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="divide-y divide-violet-50 md:hidden">
                  {visible.map((r) => (
                    <div key={r.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <input
                          aria-label={`Select ${r.title}`}
                          type="checkbox"
                          checked={selected.includes(r.id)}
                          onChange={(e) =>
                            setSelected((s) =>
                              e.target.checked
                                ? [...s, r.id]
                                : s.filter((id) => id !== r.id),
                            )
                          }
                        />
                        <button
                          className="min-w-0 flex-1 text-left"
                          onClick={() => openDetail(r)}
                        >
                          <strong className="block text-sm">
                            {r.title || "Untitled draft"}
                          </strong>
                          <span className="mt-2 block text-xs text-[#73718A]">
                            {r.audience} · {formatDate(r.date)}
                          </span>
                        </button>
                        <RowActions
                          item={r}
                          menu={menu}
                          setMenu={setMenu}
                          action={action}
                        />
                      </div>
                      <div className="ml-7 mt-2">
                        <Badge status={r.status} />
                      </div>
                    </div>
                  ))}
                </div>
                {visible.length === 0 && (
                  <div className="p-10 text-center text-sm text-[#73718A]">
                    No announcements match your filters.{" "}
                    <button
                      className="text-violet-700 underline"
                      onClick={() => {
                        setFilter("all");
                        setSearch("");
                        setPage(1);
                      }}
                    >
                      Reset filters
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-violet-50 px-4 py-3 text-xs text-[#73718A]">
                  <span>{filtered.length} announcements</span>
                  <div className="flex items-center gap-3">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setPage(currentPage - 1)}
                      className="disabled:opacity-30"
                    >
                      Previous
                    </button>
                    <span>
                      {currentPage} / {pages}
                    </span>
                    <button
                      disabled={currentPage >= pages}
                      onClick={() => setPage(currentPage + 1)}
                      className="disabled:opacity-30"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </section>
              {open && (
                <Modal
                  title={editId ? "Edit Announcement" : "Create Announcement"}
                  subtitle={editId ? "Update the selected announcement." : "Create and share important company updates."}
                  icon={LuMegaphone}
                  maxWidth="max-w-3xl"
                  onClose={() => dirty ? setConfirm({ kind: "close" }) : setOpen(false)}
                  footer={
                    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button className={secondary} onClick={() => dirty ? setConfirm({ kind: "close" }) : setOpen(false)}>Cancel</button>
                      <button className={secondary} onClick={() => save("draft")}><span className="flex items-center gap-2"><LuFileText size={16} />Save as Draft</span></button>
                      <button className={primary} onClick={() => { if (validate()) setConfirm({ kind: form.schedule ? "schedule" : "publish" }); }}><span className="flex items-center gap-2"><LuCircleCheck size={16} />{form.schedule ? "Schedule Announcement" : editId ? "Save Changes" : "Publish Now"}</span></button>
                    </div>
                  }
                >
                  <div className="space-y-6">
                    <section>
                      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#282442]"><span className="grid h-6 w-6 place-items-center rounded-md bg-violet-100 text-xs text-violet-700">01</span>Announcement Information</div>
                      <div className="grid gap-4 sm:grid-cols-[1.35fr_1fr]">
                    <label className="block text-xs font-semibold">
                      Title <span className="text-red-500">*</span>
                      <input
                        ref={titleRef}
                        className={`${input} mt-1.5`}
                        value={form.title}
                        maxLength={150}
                        onChange={(e) => update({ title: e.target.value })}
                         placeholder="Enter announcement title"
                      />
                    </label>
                    <label className="block text-xs font-semibold">
                      Audience <span className="text-red-500">*</span>
                      <select
                        className={`${input} mt-1.5`}
                        value={form.audience}
                        onChange={(e) => update({ audience: e.target.value })}
                      >
                        <option>All Employees</option>
                        <option>Managers</option>
                        <option>HR Department</option>
                        <option>Specific Departments</option>
                        <option>Specific Branches</option>
                      </select>
                    </label>
                      </div>
                    </section>
                    <section>
                      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#282442]"><span className="grid h-6 w-6 place-items-center rounded-md bg-violet-100 text-xs text-violet-700">02</span>Content</div>
                    <div className="text-xs font-semibold">
                      Content <span className="text-red-500">*</span>
                      <div className="mt-1.5 overflow-hidden rounded-lg border border-[#ded8ed]">
                        <div className="flex gap-1 overflow-x-auto border-b border-[#eeeaf7] bg-[#fbfaff] p-1">
                          {(
                            [
                              [LuBold, "bold", "Bold"],
                              [LuItalic, "italic", "Italic"],
                              [LuUnderline, "underline", "Underline"],
                              [LuList, "insertUnorderedList", "Bulleted list"],
                              [
                                LuListOrdered,
                                "insertOrderedList",
                                "Numbered list",
                              ],
                            ] as const
                          ).map(([Icon, cmd, label]) => (
                            <button
                              key={cmd}
                              type="button"
                              title={label}
                              aria-label={label}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => toolbar(cmd)}
                              className="rounded p-2 hover:bg-violet-100"
                            >
                              <Icon size={15} />
                            </button>
                          ))}
                          <button
                            type="button"
                            title="Insert link"
                            aria-label="Insert link"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              const s = window.getSelection();
                              savedRange.current = s?.rangeCount
                                ? s.getRangeAt(0).cloneRange()
                                : null;
                              setLinkOpen(true);
                            }}
                            className="rounded p-2 hover:bg-violet-100"
                          >
                            <LuLink size={15} />
                          </button>
                          <button
                            type="button"
                            title="Remove link"
                            aria-label="Remove link"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => toolbar("unlink")}
                            className="rounded p-2 text-xs hover:bg-violet-100"
                          >
                            Unlink
                          </button>
                        </div>
                        <div
                          ref={editor}
                          contentEditable
                          suppressContentEditableWarning
                          role="textbox"
                          aria-label="Announcement content"
                          aria-multiline="true"
                          onInput={(e) =>
                            update({
                              content: sanitize(e.currentTarget.innerHTML),
                            })
                          }
                          onPaste={(e) => {
                            e.preventDefault();
                            document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
                            update({ content: sanitize(e.currentTarget.innerHTML) });
                          }}
                          className="min-h-[135px] p-3 text-sm font-normal outline-none [&_a]:text-violet-700 [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
                        />
                      </div>
                    </div>
                    </section>
                    <section>
                      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#282442]"><span className="grid h-6 w-6 place-items-center rounded-md bg-violet-100 text-xs text-violet-700">03</span>Attachments</div>
                    <div>
                      <div className="mt-2 space-y-1">
                        {form.attachments.map((a) => (
                          <div
                            key={a.id}
                            className="flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-xs"
                          >
                            <LuPaperclip />
                            <span className="min-w-0 flex-1 truncate">
                              {a.name} ({Math.round(a.size / 1024)} KB)
                              {a.local
                                ? " · local selection"
                                : " · demo metadata"}
                            </span>
                            <button
                              aria-label={`Remove ${a.name}`}
                              onClick={() =>
                                update({
                                  attachments: form.attachments.filter(
                                    (x) => x.id !== a.id,
                                  ),
                                })
                              }
                            >
                              <LuX />
                            </button>
                          </div>
                        ))}
                      </div>
                      <label className="mt-2 block cursor-pointer rounded-lg border border-dashed border-violet-200 p-3 text-center text-xs text-violet-700 hover:bg-violet-50">
                        Add files{" "}
                        <span className="text-[#8b869d]">
                          (PDF, DOCX, PNG, JPG; max 10 MB each)
                        </span>
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.docx,.png,.jpg,.jpeg"
                          className="sr-only"
                          onChange={(e) => {
                            addFiles(e.target.files);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <p className="mt-1 text-[11px] text-[#8b869d]">
                        Files are not uploaded in this demo.
                      </p>
                    </div>
                    </section>
                    <section>
                      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#282442]"><span className="grid h-6 w-6 place-items-center rounded-md bg-violet-100 text-xs text-violet-700">04</span>Publishing Options</div>
                    <label className="flex items-center gap-2 text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={form.schedule}
                        onChange={(e) => update({ schedule: e.target.checked })}
                        className="accent-violet-600"
                      />
                      Schedule for later
                    </label>
                    {form.schedule && (
                      <div>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="text-xs text-[#73718A]">
                            Date
                            <input
                              aria-label="Schedule date"
                              type="date"
                              className={`${input} mt-1`}
                              value={form.date}
                              onChange={(e) => update({ date: e.target.value })}
                            />
                          </label>
                          <label className="text-xs text-[#73718A]">
                            Time
                            <input
                              aria-label="Schedule time"
                              type="time"
                              className={`${input} mt-1`}
                              value={form.time}
                              onChange={(e) => update({ time: e.target.value })}
                            />
                          </label>
                        </div>
                        <p className="mt-1 text-[11px] text-[#73718A]">
                          Company timezone: Asia/Manila
                        </p>
                      </div>
                    )}
                    {errors.length > 0 && (
                      <div
                        role="alert"
                        className="rounded-lg bg-red-50 p-3 text-xs text-red-700"
                      >
                        {errors.map((e) => (
                          <p key={e}>{e}</p>
                        ))}
                      </div>
                    )}
                    </section>
                  </div>
                </Modal>
              )}
            </div>
          </div>
        </main>
      {toast && (
        <div
          role="status"
          className="fixed right-4 top-20 z-[90] flex max-w-sm items-start gap-3 rounded-xl border border-violet-100 bg-white p-4 text-sm shadow-xl"
        >
          <LuCircleCheck className="shrink-0 text-violet-600" />
          <span>{toast}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <LuX />
          </button>
        </div>
      )}
      {view && (
        <Modal
          title="Announcement Details"
          subtitle="Review announcement information and publication status."
          icon={LuFileText}
          maxWidth="max-w-3xl"
          onClose={() => setView(null)}
          footer={
            <>
              <button className={secondary} onClick={() => setView(null)}>
                Close
              </button>
              <button className={secondary} onClick={() => askLoad(view, true)}>
                Duplicate
              </button>
              {["draft", "scheduled"].includes(view.status) && (
                <button className={primary} onClick={() => askLoad(view)}>
                  Edit
                </button>
              )}
            </>
          }
        >
          <p className="mb-4 text-xs text-[#73718A]">Review announcement information and publication status.</p>
          <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-bold text-[#282442]">
              {view.title || "Untitled draft"}
            </h3>
            <Badge status={view.status} />
            <span className="rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-violet-700 shadow-sm">{view.audience}</span>
          </div>
          </div>
          <dl className="mt-5 grid gap-3 text-xs sm:grid-cols-2">
            <div className="rounded-xl border border-violet-100 bg-white p-3">
              <dt className="text-[#73718A]">Audience</dt>
              <dd className="mt-1 font-semibold">{view.audience}</dd>
            </div>
            <div className="rounded-xl border border-violet-100 bg-white p-3">
              <dt className="text-[#73718A]">Created by</dt>
              <dd className="mt-1 font-semibold">HR Team</dd>
            </div>
            <div className="rounded-xl border border-violet-100 bg-white p-3">
              <dt className="text-[#73718A]">Created</dt>
              <dd className="mt-1">{formatDate(view.createdAt)}</dd>
            </div>
            <div className="rounded-xl border border-violet-100 bg-white p-3">
              <dt className="text-[#73718A]">Scheduled / published</dt>
              <dd className="mt-1">{formatDate(view.date)} · Asia/Manila</dd>
            </div>
          </dl>
          <div className="mt-5">
            <strong className="text-sm text-[#282442]">Announcement Content</strong>
            <div
              className="mt-2 rounded-xl border border-violet-100 bg-[#fbfaff] p-4 leading-6 text-[#4c4864] [&_a]:text-violet-700 [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: sanitize(view.content) }}
            />
          </div>
          <div className="mt-5">
            <strong className="text-sm text-[#282442]">Attachments</strong>
            <p className="mt-2 text-xs text-[#73718A]">
              {view.attachments.length
                ? view.attachments.map((a) => a.name).join(", ")
                : "No attachments"}
            </p>
          </div>
        </Modal>
      )}
      {linkOpen && (
        <Modal
          title="Insert Link"
          onClose={() => setLinkOpen(false)}
          footer={
            <>
              <button className={secondary} onClick={() => setLinkOpen(false)}>
                Cancel
              </button>
              <button
                className={primary}
                onClick={() => {
                  try {
                    const url = new URL(linkUrl);
                    if (!["http:", "https:", "mailto:"].includes(url.protocol))
                      throw Error();
                    editor.current?.focus();
                    const sel = window.getSelection();
                    if (savedRange.current && sel) {
                      sel.removeAllRanges();
                      sel.addRange(savedRange.current);
                    }
                    document.execCommand(
                      "insertHTML",
                      false,
                      `<a href="${url.href.replace(/"/g, "&quot;")}">${linkText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") || url.href}</a>`,
                    );
                    update({
                      content: sanitize(editor.current?.innerHTML || ""),
                    });
                    setLinkOpen(false);
                    setLinkText("");
                    setLinkUrl("");
                  } catch {
                    setToast("Enter a valid http, https, or mailto URL.");
                  }
                }}
              >
                Insert Link
              </button>
            </>
          }
        >
          <label className="block text-xs font-semibold">
            Link Text
            <input
              className={`${input} mt-1`}
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
            />
          </label>
          <label className="mt-4 block text-xs font-semibold">
            URL
            <input
              className={`${input} mt-1`}
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </label>
        </Modal>
      )}
      {confirm && (
        <Modal
          title={
            (
              {
                close: "Discard Unsaved Announcement?",
                create: "Discard Unsaved Announcement?",
                edit: "Discard Unsaved Announcement?",
                duplicate: "Discard Unsaved Announcement?",
                publish: "Publish Announcement Now?",
                schedule: "Schedule Announcement?",
                archive: "Archive Announcement?",
                restore: "Restore as Draft?",
                cancel: "Cancel Scheduled Announcement?",
                bulk: "Archive Selected Announcements?",
              } as Record<string, string>
            )[confirm.kind]
          }
          onClose={() => setConfirm(null)}
          footer={
            <>
              <button className={secondary} onClick={() => setConfirm(null)}>
                {["close", "create", "edit", "duplicate"].includes(confirm.kind)
                  ? "Keep Editing"
                  : "Cancel"}
              </button>
              <button
                className={primary}
                onClick={() => {
                  const { kind, item, intent } = confirm;
                  if (kind === "close") {
                    setOpen(false);
                    setDirty(false);
                    setConfirm(null);
                  } else if (["create", "edit", "duplicate"].includes(kind)) {
                    setConfirm(null);
                    load(item, kind === "duplicate", intent);
                  } else if (kind === "publish" || kind === "schedule")
                    save(kind === "publish" ? "published" : "scheduled");
                  else if (kind === "bulk") {
                    setRecords((rs) =>
                      rs.map((r) =>
                        selected.includes(r.id) && r.status !== "archived"
                          ? { ...r, status: "archived" }
                          : r,
                      ),
                    );
                    setSelected([]);
                    setConfirm(null);
                    setToast(
                      "Selected eligible announcements moved to the archive.",
                    );
                  } else if (item) transition(kind, item);
                }}
              >
                {["close", "create", "edit", "duplicate"].includes(confirm.kind)
                  ? "Discard Changes"
                  : confirm.kind === "publish"
                    ? "Confirm Publish"
                    : confirm.kind === "schedule"
                      ? "Confirm Schedule"
                      : "Confirm"}
              </button>
            </>
          }
        >
          <p>
            {["close", "create", "edit", "duplicate"].includes(confirm.kind) ? (
              "Your announcement contains unsaved changes."
            ) : confirm.kind === "publish" || confirm.kind === "schedule" ? (
              <>
                <strong>{form.title}</strong>
                <br />
                Audience: {form.audience}
                <br />
                {confirm.kind === "schedule" ? (
                  <>
                    Scheduled: {form.date} at {form.time} · Asia/Manila
                    <br />
                    This demo does not automatically publish scheduled
                    announcements.
                  </>
                ) : (
                  "Publication mode: Immediate. No messages are delivered in this demo."
                )}
              </>
            ) : confirm.kind === "bulk" ? (
              "Eligible selected announcements will be archived."
            ) : (
              <>
                <strong>{confirm.item?.title}</strong>
                <br />
                Current status: {confirm.item?.status}
                {confirm.kind === "archive" && (
                  <>
                    <br />
                    Archiving does not retract previously delivered messages.
                  </>
                )}
              </>
            )}
          </p>
        </Modal>
      )}
    </>
  );
}
function RowActions({
  item,
  menu,
  setMenu,
  action,
}: {
  item: RecordItem;
  menu: string | null;
  setMenu: (id: string | null) => void;
  action: (kind: string, item: RecordItem) => void;
}) {
  const actions: Record<Status, string[]> = {
    draft: ["View", "Edit", "Publish Now", "Schedule", "Archive"],
    scheduled: ["View", "Edit Schedule", "Cancel Schedule", "Archive"],
    published: ["View", "Archive", "Duplicate"],
    archived: ["View", "Restore as Draft", "Duplicate"],
  };
  return (
    <div className="relative flex items-center gap-1">
      <button
        className="rounded-md p-2 text-[18px] hover:bg-violet-100"
        aria-label={`View ${item.title}`}
        onClick={() => action("View", item)}
      >
        <LuEye />
      </button>
      {["draft", "scheduled"].includes(item.status) && (
        <button
          className="rounded-md p-2 text-[18px] hover:bg-violet-100"
          aria-label={`Edit ${item.title}`}
          onClick={() => action("Edit", item)}
        >
          <LuPencil />
        </button>
      )}
      <button
        className="rounded-md p-2 text-[18px] hover:bg-violet-100"
        aria-label={`More actions for ${item.title}`}
        aria-expanded={menu === item.id}
        onClick={() => setMenu(menu === item.id ? null : item.id)}
      >
        <LuEllipsis />
      </button>
      {menu === item.id && (
        <div className="absolute right-0 top-full z-30 w-40 rounded-lg border border-violet-100 bg-white py-1 shadow-xl">
          {actions[item.status].map((a) => (
            <button
              key={a}
              className="block w-full px-3 py-2 text-left text-xs hover:bg-violet-50"
              onClick={() => action(a, item)}
            >
              {a}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
