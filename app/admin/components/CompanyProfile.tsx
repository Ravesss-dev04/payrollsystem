"use client";
import { useState } from "react";
import {
  LuBuilding2,
  LuCalendarDays,
  LuImagePlus,
  LuUsers,
} from "react-icons/lu";
import { businessTypes } from "../company/data";
import { BusinessType, CompanyProfile as Profile } from "../company/types";

const input =
  "mt-1.5 w-full rounded-lg border border-[#E4E1EF] bg-[#F9F8FD] px-3 py-2.5 text-sm text-[#17152D] outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]";
export default function CompanyProfile({
  company,
  employees,
  branches,
  onSave,
  onDirty,
}: {
  company: Profile;
  employees: number;
  branches: number;
  onSave: (value: Profile) => void;
  onDirty: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState(company);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(company);
  function update(next: Profile) {
    setDraft(next);
    onDirty(JSON.stringify(next) !== JSON.stringify(company));
    setMessage("");
  }
  function save(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (draft.name.trim().length < 2)
      next.name = "Enter a company name of at least 2 characters.";
    if (!draft.tin.trim()) next.tin = "Enter a TIN.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email))
      next.email = "Enter a valid email address.";
    if (
      !/^[+\d\s().-]{7,}$/.test(draft.phone) ||
      draft.phone.replace(/\D/g, "").length < 7
    )
      next.phone = "Enter a valid contact number.";
    if (!draft.address.trim()) next.address = "Enter an address.";
    setErrors(next);
    if (!Object.keys(next).length) {
      onSave(draft);
      onDirty(false);
      setMessage("Changes saved for this session.");
    }
  }
  function logo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setErrors((v) => ({
        ...v,
        logo: "Choose a PNG, JPEG, or WebP image up to 2 MB.",
      }));
      return;
    }
    setErrors((v) => ({ ...v, logo: "" }));
    const reader = new FileReader();
    reader.onload = () => update({ ...draft, logo: String(reader.result) });
    reader.readAsDataURL(file);
  }
  const field = (
    key: "name" | "tin" | "email" | "phone" | "address",
    label: string,
    type = "text",
  ) => (
    <label className="block text-xs font-semibold text-[#333149]">
      {label}
      {key === "address" ? (
        <textarea
          className={`${input} min-h-20 resize-y`}
          value={draft[key]}
          onChange={(e) => update({ ...draft, [key]: e.target.value })}
          aria-invalid={!!errors[key]}
        />
      ) : (
        <input
          className={input}
          type={type}
          value={draft[key]}
          onChange={(e) => update({ ...draft, [key]: e.target.value })}
          aria-invalid={!!errors[key]}
        />
      )}
      {errors[key] && (
        <span className="mt-1 block text-xs text-red-600">{errors[key]}</span>
      )}
    </label>
  );
  return (
    <form
      onSubmit={save}
      className="rounded-2xl border border-[#EDEAF6] bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#211D3B] text-2xl font-bold text-white">
          {draft.logo ? (
            <img
              src={draft.logo}
              alt="Company logo preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <span aria-label="Company logo placeholder">
              A<span className="text-purple-400">.</span>
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-xl font-bold">{company.name}</h2>
          <p className="text-sm text-[#73718A]">{company.businessType}</p>
          <span className="mt-2 inline-block rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
            {company.status}
          </span>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#DCD9E9] px-4 py-2 text-sm font-semibold hover:bg-purple-50">
          <LuImagePlus /> Upload Logo
          <input
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={logo}
          />
        </label>
      </div>
      {errors.logo && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {errors.logo}
        </p>
      )}
      <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,2fr)_minmax(250px,1fr)]">
        <div className="grid content-start gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">{field("name", "Company Name")}</div>
          <label className="block text-xs font-semibold">
            Business Type
            <select
              className={input}
              value={draft.businessType}
              onChange={(e) =>
                update({
                  ...draft,
                  businessType: e.target.value as BusinessType,
                })
              }
            >
              {businessTypes.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          {field("tin", "Tax Identification No. (TIN)")}
          {field("email", "Contact Email", "email")}
          {field("phone", "Contact Number", "tel")}
          <div className="sm:col-span-2">{field("address", "Address")}</div>
        </div>
        <aside>
          <div
            className="flex aspect-video items-center justify-center rounded-xl bg-[#EDEAF6] text-[#9287B7]"
            aria-label="Building image placeholder"
          >
            <LuBuilding2 size={58} />
          </div>
          <h3 className="mt-4 text-base font-bold">Company Summary</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#73718A]">
            {company.description}
          </p>
          <div className="mt-4 text-sm">
            {[
              [<LuCalendarDays key="c" />, "Established", company.established],
              [<LuUsers key="u" />, "Employee Count", employees],
              [<LuBuilding2 key="b" />, "Branches", branches],
            ].map(([icon, label, value]) => (
              <div
                key={String(label)}
                className="flex items-center gap-2 border-b border-[#EDEAF6] py-2 text-[#73718A]"
              >
                {icon}
                <span>{label}</span>
                <span className="ml-auto font-semibold text-[#17152D]">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-[#EDEAF6] pt-5">
        <p role="status" className="mr-auto text-sm text-green-700">
          {message}
        </p>
        <button
          type="button"
          disabled={!dirty}
          onClick={() => {
            setDraft(company);
            setErrors({});
            onDirty(false);
            setMessage("");
          }}
          className="rounded-lg border border-[#DCD9E9] px-5 py-2 text-sm font-semibold disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          disabled={!dirty}
          className="rounded-lg bg-[#7C3AED] px-5 py-2 text-sm font-semibold text-white hover:bg-[#6D28D9] disabled:opacity-50"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
}
