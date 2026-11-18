"use client";

import { useState, useTransition } from "react";
import type {
  FullPayrollConfiguration,
  CompanyPayrollSettings,
  EarningItemConfig,
  DeductionItemConfig,
  BenefitItemConfig,
  EmployeeApplicability,
} from "../../../lib/payroll/company-config";
import type { SimulationResult } from "../../../lib/payroll/simulation";
import { requestPayrollApi, PayrollApiError } from "../../../lib/payroll-results/client-api";

type TabId =
  | "companySettings"
  | "earnings"
  | "deductions"
  | "benefits"
  | "applicability"
  | "simulation"
  | "history";

interface HistoryItem {
  id: string;
  version: number;
  category: string;
  status: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  changeReason: string;
  supportingReference: string | null;
  createdAt: string;
}

export function PayrollConfigPortalClient({
  initialActive,
  initialHistory,
}: {
  initialActive: {
    version: number;
    category: string;
    status: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
    configuration: FullPayrollConfiguration;
  };
  initialHistory: {
    items: HistoryItem[];
    total: number;
    page: number;
    pageSize: number;
  };
}) {
  const [activeTab, setActiveTab] = useState<TabId>("companySettings");
  const [config, setConfig] = useState<FullPayrollConfiguration>(
    initialActive.configuration,
  );
  const [history, setHistory] = useState(initialHistory.items);

  // Draft Submission State
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [changeReason, setChangeReason] = useState("");
  const [supportingReference, setSupportingReference] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Simulation State
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isSimulating, startSimulation] = useTransition();
  const [isSubmitting, startSubmission] = useTransition();

  // Helper to update settings
  function updateSettings<K extends keyof CompanyPayrollSettings>(
    key: K,
    val: CompanyPayrollSettings[K],
  ) {
    setConfig((prev) => ({
      ...prev,
      settings: { ...prev.settings, [key]: val },
    }));
  }

  // Helper to update applicability
  function updateApplicability<K extends keyof EmployeeApplicability>(
    key: K,
    val: EmployeeApplicability[K],
  ) {
    setConfig((prev) => ({
      ...prev,
      applicability: { ...prev.applicability, [key]: val },
    }));
  }

  // Trigger Simulation
  function handleRunSimulation() {
    setSubmitError(null);
    startSimulation(async () => {
      try {
        const res = (await requestPayrollApi("/api/hr/payroll/config/simulate", {
          method: "POST",
          body: {
            category: "GeneralSettings",
            proposedConfiguration: config,
          },
        })) as { simulation: SimulationResult };
        setSimulation(res.simulation);
        setActiveTab("simulation");
      } catch (err) {
        setSubmitError(
          err instanceof PayrollApiError
            ? `Simulation error: ${err.code}`
            : "Failed to run calculation simulation. Check proposed inputs.",
        );
      }
    });
  }

  // Submit Draft for Approval
  function handleSubmitDraft(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!changeReason.trim()) {
      setSubmitError("A business reason for this configuration change is required.");
      return;
    }

    startSubmission(async () => {
      try {
        const payload = {
          category: "GeneralSettings",
          effectiveFrom,
          changeReason: changeReason.trim(),
          supportingReference: supportingReference.trim() || undefined,
          configuration: config,
          applicability: config.applicability,
        };

        const res = (await requestPayrollApi("/api/hr/payroll/config", {
          method: "POST",
          body: payload,
        })) as { draft: HistoryItem };

        // Immediately submit draft for Admin approval
        await requestPayrollApi(`/api/hr/payroll/config/${res.draft.id}/submit`, {
          method: "POST",
        });

        setSubmitSuccess(
          `Configuration draft Version ${res.draft.version} created and submitted for Admin approval.`,
        );
        setHistory((prev) => [{ ...res.draft, status: "PendingApproval" }, ...prev]);
        setChangeReason("");
        setSupportingReference("");
      } catch (err) {
        setSubmitError(
          err instanceof PayrollApiError
            ? `Draft submission failed: ${err.code}`
            : "Could not create configuration draft. Please check the values.",
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <nav aria-label="Payroll Configuration Sections" className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {(
          [
            ["companySettings", "12.1 Company Settings"],
            ["earnings", "12.2 Earnings"],
            ["deductions", "12.3 Deductions"],
            ["benefits", "12.4 Benefits"],
            ["applicability", "12.5 Applicability"],
            ["simulation", "12.6 Simulation & Preview"],
            ["history", "Version History"],
          ] as [TabId, string][]
        ).map(([tabId, label]) => (
          <button
            key={tabId}
            type="button"
            onClick={() => setActiveTab(tabId)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tabId
                ? "bg-[#7C3AED] text-white"
                : "bg-gray-100 text-[#73718A] hover:bg-gray-200 hover:text-[#1E1B4B]"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Notifications */}
      {submitError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {submitError}
        </div>
      )}
      {submitSuccess && (
        <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {submitSuccess}
        </div>
      )}

      {/* 12.1 Company Payroll Settings */}
      {activeTab === "companySettings" && (
        <section aria-labelledby="company-settings-heading" className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="border-b pb-4">
            <h2 id="company-settings-heading" className="text-lg font-bold text-[#1E1B4B]">
              12.1 Company Payroll Settings
            </h2>
            <p className="text-sm text-[#73718A]">
              Configure pay frequencies, cutoffs, working schedule, divisors, and conversion rules.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="payroll-frequency" className="block text-xs font-semibold uppercase text-[#73718A]">
                Payroll Frequency
              </label>
              <select
                id="payroll-frequency"
                value={config.settings.frequency}
                onChange={(e) => updateSettings("frequency", e.target.value as any)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:border-[#7C3AED] focus:outline-none"
              >
                <option value="SemiMonthly">Semi-Monthly (Twice a month)</option>
                <option value="Monthly">Monthly</option>
                <option value="BiWeekly">Bi-Weekly (Every 2 weeks)</option>
                <option value="Weekly">Weekly</option>
              </select>
            </div>

            <div>
              <label htmlFor="first-half-cutoff" className="block text-xs font-semibold uppercase text-[#73718A]">
                First Half Cutoff Range
              </label>
              <input
                id="first-half-cutoff"
                type="text"
                value={config.settings.cutoffFirstHalf}
                onChange={(e) => updateSettings("cutoffFirstHalf", e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="first-half-pay-date" className="block text-xs font-semibold uppercase text-[#73718A]">
                First Half Pay Date
              </label>
              <input
                id="first-half-pay-date"
                type="text"
                value={config.settings.payDateFirstHalf}
                onChange={(e) => updateSettings("payDateFirstHalf", e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="second-half-cutoff" className="block text-xs font-semibold uppercase text-[#73718A]">
                Second Half Cutoff Range
              </label>
              <input
                id="second-half-cutoff"
                type="text"
                value={config.settings.cutoffSecondHalf}
                onChange={(e) => updateSettings("cutoffSecondHalf", e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="second-half-pay-date" className="block text-xs font-semibold uppercase text-[#73718A]">
                Second Half Pay Date
              </label>
              <input
                id="second-half-pay-date"
                type="text"
                value={config.settings.payDateSecondHalf}
                onChange={(e) => updateSettings("payDateSecondHalf", e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="company-timezone" className="block text-xs font-semibold uppercase text-[#73718A]">
                Company Timezone
              </label>
              <input
                id="company-timezone"
                type="text"
                value={config.settings.timeZone}
                onChange={(e) => updateSettings("timeZone", e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="monthly-to-daily-divisor" className="block text-xs font-semibold uppercase text-[#73718A]">
                Monthly-to-Daily Divisor
              </label>
              <input
                id="monthly-to-daily-divisor"
                type="text"
                value={config.settings.monthlyToDailyDivisor}
                onChange={(e) => updateSettings("monthlyToDailyDivisor", e.target.value)}
                placeholder="261 or 313"
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
              />
              <span className="text-xs text-gray-500">Standard PH 5-day: 261; 6-day: 313</span>
            </div>

            <div>
              <label htmlFor="daily-to-hourly-divisor" className="block text-xs font-semibold uppercase text-[#73718A]">
                Daily-to-Hourly Divisor
              </label>
              <input
                id="daily-to-hourly-divisor"
                type="text"
                value={config.settings.dailyToHourlyDivisor}
                onChange={(e) => updateSettings("dailyToHourlyDivisor", e.target.value)}
                placeholder="8"
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="working-days-per-week" className="block text-xs font-semibold uppercase text-[#73718A]">
                Working Days per Week
              </label>
              <input
                id="working-days-per-week"
                type="number"
                min={1}
                max={7}
                value={config.settings.workingDaysPerWeek}
                onChange={(e) => updateSettings("workingDaysPerWeek", parseInt(e.target.value, 10) || 5)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="standard-hours-per-day" className="block text-xs font-semibold uppercase text-[#73718A]">
                Standard Hours per Day
              </label>
              <input
                id="standard-hours-per-day"
                type="number"
                min={1}
                max={24}
                value={config.settings.standardHoursPerDay}
                onChange={(e) => updateSettings("standardHoursPerDay", parseInt(e.target.value, 10) || 8)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="rounding-policy" className="block text-xs font-semibold uppercase text-[#73718A]">
                Rounding Policy
              </label>
              <select
                id="rounding-policy"
                value={config.settings.roundingPolicy}
                onChange={(e) => updateSettings("roundingPolicy", e.target.value as any)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
              >
                <option value="HalfUp">Half Up (Commercial Standard)</option>
                <option value="Floor">Floor (Always Round Down)</option>
                <option value="Ceil">Ceil (Always Round Up)</option>
              </select>
            </div>

            <div>
              <label htmlFor="proration-method" className="block text-xs font-semibold uppercase text-[#73718A]">
                Proration Method
              </label>
              <select
                id="proration-method"
                value={config.settings.prorationMethod}
                onChange={(e) => updateSettings("prorationMethod", e.target.value as any)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
              >
                <option value="WorkingDays">Working Days Ratio</option>
                <option value="CalendarDays">Calendar Days Ratio</option>
                <option value="StandardDivisor">Standard Divisor Daily Rate</option>
              </select>
            </div>
          </div>
        </section>
      )}

      {/* 12.2 Earnings Configuration */}
      {activeTab === "earnings" && (
        <section aria-labelledby="earnings-config-heading" className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between border-b pb-4">
            <div>
              <h2 id="earnings-config-heading" className="text-lg font-bold text-[#1E1B4B]">
                12.2 Earnings Configuration
              </h2>
              <p className="text-sm text-[#73718A]">
                Configure basic pay, overtime, night differential, holiday premiums, allowances, and bonuses.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const newItem: EarningItemConfig = {
                  code: `EARN_${config.earnings.length + 1}`,
                  name: "New Custom Allowance / Earning",
                  category: "Allowance",
                  isTaxable: true,
                  includeIn13thMonth: false,
                  calculationMethod: "FixedAmount",
                  defaultAmount: "0.00",
                };
                setConfig((prev) => ({ ...prev, earnings: [...prev.earnings, newItem] }));
              }}
              className="rounded-md bg-[#7C3AED] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#6D28D9]"
            >
              + Add Earning Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-[#73718A]">
                <tr>
                  <th className="p-3">Code</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Taxable?</th>
                  <th className="p-3">In 13th-Mo?</th>
                  <th className="p-3">Default (₱)</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {config.earnings.map((earn, idx) => (
                  <tr key={earn.code + idx} className="hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs">{earn.code}</td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={earn.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConfig((prev) => {
                            const updated = [...prev.earnings];
                            updated[idx] = { ...updated[idx], name: val };
                            return { ...prev, earnings: updated };
                          });
                        }}
                        className="rounded border border-gray-300 px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="p-3 text-xs">{earn.category}</td>
                    <td className="p-3 text-xs">{earn.calculationMethod}</td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={earn.isTaxable}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setConfig((prev) => {
                            const updated = [...prev.earnings];
                            updated[idx] = { ...updated[idx], isTaxable: val };
                            return { ...prev, earnings: updated };
                          });
                        }}
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={earn.includeIn13thMonth}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setConfig((prev) => {
                            const updated = [...prev.earnings];
                            updated[idx] = { ...updated[idx], includeIn13thMonth: val };
                            return { ...prev, earnings: updated };
                          });
                        }}
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={earn.defaultAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConfig((prev) => {
                            const updated = [...prev.earnings];
                            updated[idx] = { ...updated[idx], defaultAmount: val };
                            return { ...prev, earnings: updated };
                          });
                        }}
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-xs font-mono"
                      />
                    </td>
                    <td className="p-3">
                      {earn.category !== "BasicPay" && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfig((prev) => ({
                              ...prev,
                              earnings: prev.earnings.filter((_, i) => i !== idx),
                            }));
                          }}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 12.3 Deductions Configuration */}
      {activeTab === "deductions" && (
        <section aria-labelledby="deductions-config-heading" className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between border-b pb-4">
            <div>
              <h2 id="deductions-config-heading" className="text-lg font-bold text-[#1E1B4B]">
                12.3 Deductions Configuration
              </h2>
              <p className="text-sm text-[#73718A]">
                Configure statutory schedules (SSS, PhilHealth, Pag-IBIG, Tax), company loans, cash advances, and late/undertime policies.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const newItem: DeductionItemConfig = {
                  code: `DED_${config.deductions.length + 1}`,
                  name: "New Authorized Company Deduction",
                  category: "CompanyDeduction",
                  isStatutory: false,
                  calculationMethod: "FixedAmount",
                  defaultAmount: "0.00",
                };
                setConfig((prev) => ({ ...prev, deductions: [...prev.deductions, newItem] }));
              }}
              className="rounded-md bg-[#7C3AED] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#6D28D9]"
            >
              + Add Deduction Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-[#73718A]">
                <tr>
                  <th className="p-3">Code</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Calculation Method</th>
                  <th className="p-3">Default (₱)</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {config.deductions.map((ded, idx) => (
                  <tr key={ded.code + idx} className="hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs">{ded.code}</td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={ded.name}
                        disabled={ded.isStatutory}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConfig((prev) => {
                            const updated = [...prev.deductions];
                            updated[idx] = { ...updated[idx], name: val };
                            return { ...prev, deductions: updated };
                          });
                        }}
                        className={`rounded border px-2 py-1 text-xs ${
                          ded.isStatutory ? "bg-gray-100 text-gray-500" : "border-gray-300"
                        }`}
                      />
                    </td>
                    <td className="p-3 text-xs">{ded.category}</td>
                    <td className="p-3 text-xs">
                      {ded.isStatutory ? (
                        <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">
                          Statutory
                        </span>
                      ) : (
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                          Company
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-xs">{ded.calculationMethod}</td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={ded.defaultAmount}
                        disabled={ded.isStatutory}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConfig((prev) => {
                            const updated = [...prev.deductions];
                            updated[idx] = { ...updated[idx], defaultAmount: val };
                            return { ...prev, deductions: updated };
                          });
                        }}
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-xs font-mono disabled:bg-gray-100"
                      />
                    </td>
                    <td className="p-3">
                      {!ded.isStatutory && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfig((prev) => ({
                              ...prev,
                              deductions: prev.deductions.filter((_, i) => i !== idx),
                            }));
                          }}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 12.4 Benefits Configuration */}
      {activeTab === "benefits" && (
        <section aria-labelledby="benefits-config-heading" className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between border-b pb-4">
            <div>
              <h2 id="benefits-config-heading" className="text-lg font-bold text-[#1E1B4B]">
                12.4 Benefits Configuration
              </h2>
              <p className="text-sm text-[#73718A]">
                Configure 13th-month accruals, SIL, healthcare, insurance, and company-provided allowances. Employer-paid benefits are separate from net take-home compensation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const newItem: BenefitItemConfig = {
                  code: `BEN_${config.benefits.length + 1}`,
                  name: "New Company Benefit",
                  type: "CompanyProvided",
                  fundingType: "EmployerPaid",
                  paymentType: "NonCash",
                  isTaxable: false,
                  includeIn13thMonth: false,
                  defaultAmount: "0.00",
                };
                setConfig((prev) => ({ ...prev, benefits: [...prev.benefits, newItem] }));
              }}
              className="rounded-md bg-[#7C3AED] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#6D28D9]"
            >
              + Add Benefit Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-[#73718A]">
                <tr>
                  <th className="p-3">Code</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Classification</th>
                  <th className="p-3">Funding</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Taxable?</th>
                  <th className="p-3">Default (₱)</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {config.benefits.map((ben, idx) => (
                  <tr key={ben.code + idx} className="hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs">{ben.code}</td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={ben.name}
                        disabled={ben.code === "13TH_MONTH"}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConfig((prev) => {
                            const updated = [...prev.benefits];
                            updated[idx] = { ...updated[idx], name: val };
                            return { ...prev, benefits: updated };
                          });
                        }}
                        className="rounded border border-gray-300 px-2 py-1 text-xs disabled:bg-gray-100"
                      />
                    </td>
                    <td className="p-3 text-xs">{ben.type}</td>
                    <td className="p-3 text-xs">{ben.fundingType}</td>
                    <td className="p-3 text-xs">{ben.paymentType}</td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={ben.isTaxable}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setConfig((prev) => {
                            const updated = [...prev.benefits];
                            updated[idx] = { ...updated[idx], isTaxable: val };
                            return { ...prev, benefits: updated };
                          });
                        }}
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={ben.defaultAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConfig((prev) => {
                            const updated = [...prev.benefits];
                            updated[idx] = { ...updated[idx], defaultAmount: val };
                            return { ...prev, benefits: updated };
                          });
                        }}
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-xs font-mono"
                      />
                    </td>
                    <td className="p-3">
                      {ben.code !== "13TH_MONTH" && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfig((prev) => ({
                              ...prev,
                              benefits: prev.benefits.filter((_, i) => i !== idx),
                            }));
                          }}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 12.5 Employee Applicability */}
      {activeTab === "applicability" && (
        <section aria-labelledby="applicability-config-heading" className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="border-b pb-4">
            <h2 id="applicability-config-heading" className="text-lg font-bold text-[#1E1B4B]">
              12.5 Employee Applicability
            </h2>
            <p className="text-sm text-[#73718A]">
              Define organizational scope to prevent overlapping or conflicting compensation rules.
            </p>
          </div>

          <div className="space-y-4 max-w-xl">
            <div>
              <label htmlFor="applicability-scope" className="block text-xs font-semibold uppercase text-[#73718A]">
                Applicability Scope
              </label>
              <select
                id="applicability-scope"
                value={config.applicability.scope}
                onChange={(e) => updateApplicability("scope", e.target.value as any)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
              >
                <option value="All">All Eligible Company Employees</option>
                <option value="Department">By Department</option>
                <option value="EmploymentType">By Employment Type</option>
                <option value="Position">By Position</option>
                <option value="SpecificEmployees">Specific Individual Employees</option>
              </select>
            </div>

            {config.applicability.scope === "Department" && (
              <div>
                <label htmlFor="departments-scope" className="block text-xs font-semibold uppercase text-[#73718A]">
                  Covered Department Names / IDs (comma-separated)
                </label>
                <input
                  id="departments-scope"
                  type="text"
                  value={config.applicability.departmentIds.join(", ")}
                  onChange={(e) =>
                    updateApplicability(
                      "departmentIds",
                      e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    )
                  }
                  placeholder="e.g. Operations, Engineering, Logistics"
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
                />
              </div>
            )}

            {config.applicability.scope === "EmploymentType" && (
              <div>
                <label htmlFor="employment-types-scope" className="block text-xs font-semibold uppercase text-[#73718A]">
                  Employment Types (comma-separated)
                </label>
                <input
                  id="employment-types-scope"
                  type="text"
                  value={config.applicability.employmentTypes.join(", ")}
                  onChange={(e) =>
                    updateApplicability(
                      "employmentTypes",
                      e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    )
                  }
                  placeholder="e.g. Regular, Probationary, Contractual"
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* 12.6 Configuration Preview & Simulation */}
      {activeTab === "simulation" && (
        <section aria-labelledby="simulation-heading" className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="border-b pb-4">
            <h2 id="simulation-heading" className="text-lg font-bold text-[#1E1B4B]">
              12.6 Configuration Preview and Simulation Engine
            </h2>
            <p className="text-sm text-[#73718A]">
              Run non-destructive financial simulations against representative synthetic employee data. Previews never activate rules or modify actual payroll batch records.
            </p>
          </div>

          <div>
            <button
              type="button"
              disabled={isSimulating}
              onClick={handleRunSimulation}
              className="rounded-lg bg-[#7C3AED] px-5 py-2 text-sm font-semibold text-white shadow hover:bg-[#6D28D9] disabled:opacity-50"
            >
              {isSimulating ? "Running Simulation..." : "▶ Run Calculation Simulation"}
            </button>
          </div>

          {simulation ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <span className="text-xs font-medium text-[#73718A]">Sample Employees Tested</span>
                  <p className="mt-1 text-2xl font-bold text-[#1E1B4B]">{simulation.sampleCount}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <span className="text-xs font-medium text-[#73718A]">Affected Employees</span>
                  <p className="mt-1 text-2xl font-bold text-amber-600">{simulation.affectedEmployeesCount}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <span className="text-xs font-medium text-[#73718A]">Aggregate Payroll Impact (₱)</span>
                  <p className="mt-1 text-2xl font-bold text-[#1E1B4B]">₱{simulation.estimatedAggregateFinancialImpact}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <span className="text-xs font-medium text-[#73718A]">Net Pay Variance (₱)</span>
                  <p className="mt-1 text-2xl font-bold text-[#7C3AED]">₱{simulation.diffNetPay}</p>
                </div>
              </div>

              {/* Detailed Simulation Delta Table */}
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-gray-50 text-xs uppercase text-[#73718A]">
                    <tr>
                      <th className="p-3">Financial Metric</th>
                      <th className="p-3">Current Active (₱)</th>
                      <th className="p-3">Proposed Draft (₱)</th>
                      <th className="p-3">Financial Variance / Delta (₱)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="p-3 font-medium text-[#1E1B4B]">Gross Earnings</td>
                      <td className="p-3 font-mono">₱{simulation.currentGross}</td>
                      <td className="p-3 font-mono">₱{simulation.proposedGross}</td>
                      <td className="p-3 font-mono font-semibold text-blue-600">₱{simulation.diffGross}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-[#1E1B4B]">Employee Deductions</td>
                      <td className="p-3 font-mono">₱{simulation.currentDeductions}</td>
                      <td className="p-3 font-mono">₱{simulation.proposedDeductions}</td>
                      <td className="p-3 font-mono font-semibold text-amber-600">₱{simulation.diffDeductions}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-[#1E1B4B]">Employee Net Take-Home Pay</td>
                      <td className="p-3 font-mono">₱{simulation.currentNetPay}</td>
                      <td className="p-3 font-mono">₱{simulation.proposedNetPay}</td>
                      <td className="p-3 font-mono font-semibold text-green-600">₱{simulation.diffNetPay}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-[#1E1B4B]">Employer Mandatory Contributions</td>
                      <td className="p-3 font-mono">₱{simulation.currentEmployerContribution}</td>
                      <td className="p-3 font-mono">₱{simulation.proposedEmployerContribution}</td>
                      <td className="p-3 font-mono font-semibold text-purple-600">₱{simulation.diffEmployerContribution}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-[#1E1B4B]">13th-Month &amp; Benefit Accruals</td>
                      <td className="p-3 font-mono">₱{simulation.currentBenefitAccrual}</td>
                      <td className="p-3 font-mono">₱{simulation.proposedBenefitAccrual}</td>
                      <td className="p-3 font-mono font-semibold text-indigo-600">₱{simulation.diffBenefitAccrual}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Submit as Draft Form */}
              <form onSubmit={handleSubmitDraft} className="space-y-4 rounded-lg border border-[#7C3AED]/20 bg-[#7C3AED]/5 p-5">
                <h3 className="font-bold text-[#1E1B4B]">Submit Proposed Configuration for Administrative Approval</h3>
                <p className="text-xs text-[#73718A]">
                  Submitted configurations require Admin review before activation. Once approved, the new version becomes effective for upcoming payroll runs.
                </p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="draft-effective-from" className="block text-xs font-semibold text-[#1E1B4B]">
                      Effective From Date
                    </label>
                    <input
                      id="draft-effective-from"
                      type="date"
                      required
                      value={effectiveFrom}
                      onChange={(e) => setEffectiveFrom(e.target.value)}
                      className="mt-1 block w-full rounded border border-gray-300 bg-white p-2 text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="draft-supporting-ref" className="block text-xs font-semibold text-[#1E1B4B]">
                      Supporting Reference / Memorandum (Optional)
                    </label>
                    <input
                      id="draft-supporting-ref"
                      type="text"
                      value={supportingReference}
                      onChange={(e) => setSupportingReference(e.target.value)}
                      placeholder="e.g. Board Resolution 2026-08 / DOLE Advisory"
                      className="mt-1 block w-full rounded border border-gray-300 bg-white p-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="draft-change-reason" className="block text-xs font-semibold text-[#1E1B4B]">
                    Justification / Change Reason (Required)
                  </label>
                  <textarea
                    id="draft-change-reason"
                    rows={2}
                    required
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder="Describe why this configuration update is being proposed..."
                    className="mt-1 block w-full rounded border border-gray-300 bg-white p-2 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-[#7C3AED] px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-[#6D28D9] disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting Draft..." : "Submit Draft for Admin Approval"}
                </button>
              </form>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-[#73718A]">
              Click &quot;Run Calculation Simulation&quot; to test your proposed changes against representative synthetic employees and preview exact financial differences.
            </div>
          )}
        </section>
      )}

      {/* Version History & Audit */}
      {activeTab === "history" && (
        <section aria-labelledby="history-heading" className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="border-b pb-4">
            <h2 id="history-heading" className="text-lg font-bold text-[#1E1B4B]">
              Configuration Versions &amp; Audit Trail
            </h2>
            <p className="text-sm text-[#73718A]">
              Historical records of all approved, pending, and superseded payroll rule sets.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-[#73718A]">
                <tr>
                  <th className="p-3">Version</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Effective Date</th>
                  <th className="p-3">Reason / Justification</th>
                  <th className="p-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((ver) => (
                  <tr key={ver.id} className="hover:bg-gray-50">
                    <td className="p-3 font-bold text-[#1E1B4B]">v{ver.version}</td>
                    <td className="p-3 text-xs">{ver.category}</td>
                    <td className="p-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${
                          ver.status === "Active"
                            ? "bg-green-100 text-green-800"
                            : ver.status === "PendingApproval"
                            ? "bg-amber-100 text-amber-800"
                            : ver.status === "Rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {ver.status}
                      </span>
                    </td>
                    <td className="p-3 text-xs">{ver.effectiveFrom}</td>
                    <td className="p-3 text-xs text-gray-700">{ver.changeReason}</td>
                    <td className="p-3 text-xs text-gray-500">
                      {new Date(ver.createdAt).toLocaleDateString("en-US", {
                        timeZone: "Asia/Manila",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
