"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LuActivity,
  LuBriefcaseBusiness,
  LuCalendarDays,
  LuClock3,
  LuRotateCw,
  LuShieldCheck,
  LuUsersRound,
} from "react-icons/lu";
import { fetchDashboardSnapshot } from "./snapshot-client";
import type { DashboardSnapshot } from "./summary-schema";
import { startDashboardPolling } from "./polling";
import DashboardPanel from "../components/dashboard/DashboardPanel";
import { DashboardUnavailableState } from "../components/dashboard/DashboardUnavailableState";
import AttendanceSummaryChart from "../components/dashboard/AttendanceSummaryChart";
import DepartmentsCard from "../components/dashboard/DepartmentsCard";
import PayrollExpenseChart from "../components/dashboard/PayrollExpenseChart";
import ProjectedPayrollCard from "../components/dashboard/ProjectedPayrollCard";
import TotalEmployeesCard from "../components/dashboard/TotalEmployeesCard";

const reportingDateFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Manila",
});

export type DashboardSnapshotState =
  | { status: "loading" }
  | { status: "error"; snapshot?: DashboardSnapshot }
  | {
      status: "loaded";
      snapshot: DashboardSnapshot;
      refreshing: boolean;
    };

export function DashboardActivitiesPanel({
  state,
  onRefresh,
  refreshing = false,
}: {
  state:
    | { status: "loading" }
    | { status: "error" }
    | {
        status: "loaded";
        activities: DashboardSnapshot["activities"];
        lastUpdatedAt: string;
      };
  onRefresh: () => void;
  refreshing?: boolean;
}) {
  const loading = state.status === "loading" || refreshing;

  return (
    <DashboardPanel title="Recent Activities" icon={<LuActivity size={20} />}>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-[#73718A]">
          Trusted security and account activity
        </p>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          aria-label={
            state.status === "error"
              ? "Retry recent activities"
              : "Refresh recent activities"
          }
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#EDEAF6] px-3 text-xs font-semibold text-[#5B21B6] hover:bg-[#F7F3FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] disabled:cursor-wait disabled:opacity-60"
        >
          <LuRotateCw aria-hidden="true" size={14} />
          {state.status === "error" ? "Retry" : loading ? "Refreshing" : "Refresh"}
        </button>
      </div>

      {state.status === "loading" ? (
        <DashboardUnavailableState
          title="Loading security and account activity"
          message="Fetching the latest trusted audit events."
        />
      ) : state.status === "error" ? (
        <DashboardUnavailableState
          role="alert"
          title="Activity feed could not be loaded"
          message="The trusted activity service did not return data. Retry to check again."
        />
      ) : state.activities.length === 0 ? (
        <DashboardUnavailableState
          title="No recent security or account activity"
          message="No matching audit events were recorded for this feed."
        />
      ) : (
        <>
          <ul className="mt-3 divide-y divide-[#F0EDF7]">
            {state.activities.map((activity) => (
              <li
                key={activity.id}
                className="flex items-start gap-3 py-3 first:pt-1"
              >
                <span
                  aria-hidden="true"
                  className="mt-1 size-2 shrink-0 rounded-full bg-[#8B5CF6]"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#302B48]">
                    {activity.title}
                  </p>
                  <p className="mt-1 text-xs text-[#73718A]">
                    {activity.category === "security" ? "Security" : "Account"}
                    {" · "}
                    {activity.actorName ?? "Actor unavailable"}
                  </p>
                  <time
                    className="mt-1 block text-xs text-[#73718A]"
                    dateTime={activity.occurredAt}
                  >
                    {reportingDateFormatter.format(
                      new Date(activity.occurredAt),
                    )}{" "}
                    (Asia/Manila)
                  </time>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 border-t border-[#F0EDF7] pt-3 text-xs text-[#73718A]">
            Last updated{" "}
            <time dateTime={state.lastUpdatedAt}>
              {reportingDateFormatter.format(new Date(state.lastUpdatedAt))}
            </time>{" "}
            (Asia/Manila)
          </p>
        </>
      )}
    </DashboardPanel>
  );
}

function AccountCounts({ snapshot }: { snapshot: DashboardSnapshot }) {
  const counts = [
    ["Admin accounts", snapshot.accountCounts.byRole.admin],
    ["HR accounts", snapshot.accountCounts.byRole.hr],
    ["Employee accounts", snapshot.accountCounts.byRole.employee],
    ["Active accounts", snapshot.accountCounts.byStatus.Active],
    ["Invited accounts", snapshot.accountCounts.byStatus.Invited],
    ["Suspended accounts", snapshot.accountCounts.byStatus.Suspended],
    ["Inactive accounts", snapshot.accountCounts.byStatus.Inactive],
  ] as const;

  return (
    <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {counts.map(([label, count]) => (
        <div key={label} className="rounded-xl bg-[#F8F7FC] p-3">
          <dt className="text-xs text-[#73718A]">{label}</dt>
          <dd className="mt-1 text-xl font-bold text-[#302B48]">{count}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DashboardSnapshotView({
  state,
  onRefresh,
}: {
  state: DashboardSnapshotState;
  onRefresh: () => void;
}) {
  const snapshot =
    state.status === "loaded"
      ? state.snapshot
      : state.status === "error"
        ? state.snapshot
        : undefined;
  const activityState =
    snapshot === undefined
      ? state.status === "loading"
        ? { status: "loading" as const }
        : { status: "error" as const }
      : {
          status: "loaded" as const,
          activities: snapshot.activities,
          lastUpdatedAt: snapshot.lastUpdatedAt,
        };
  const refreshing = state.status === "loaded" && state.refreshing;

  return (
    <section
      aria-label="Database-backed system snapshot"
      className="mt-8 border-t border-[#EDEAF6] pt-6"
    >
      <h2 className="mb-4 text-xl font-bold text-[#17152D]">
        System and operational snapshot
      </h2>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <DashboardPanel title="Account overview" icon={<LuUsersRound size={20} />}>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-[#73718A]">
              Database accounts, excluding test accounts
            </p>
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#EDEAF6] px-3 text-xs font-semibold text-[#5B21B6] hover:bg-[#F7F3FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] disabled:cursor-wait disabled:opacity-60"
            >
              <LuRotateCw aria-hidden="true" size={14} />
              {refreshing ? "Refreshing" : "Refresh"}
            </button>
          </div>
          {snapshot ? (
            <AccountCounts snapshot={snapshot} />
          ) : state.status === "loading" ? (
            <DashboardUnavailableState
              title="Loading account snapshot"
              message="Fetching persisted account counts."
            />
          ) : (
            <DashboardUnavailableState
              role="alert"
              title="Dashboard snapshot could not be loaded"
              message="Account counts are unavailable until the dashboard service responds."
            />
          )}
          {state.status === "error" && snapshot ? (
            <p role="alert" className="mt-3 text-xs text-[#9F1239]">
              Refresh failed. Showing the last successful snapshot.
              <button
                type="button"
                onClick={onRefresh}
                className="ml-2 font-semibold underline"
              >
                Retry
              </button>
            </p>
          ) : null}
          {snapshot ? (
            <p className="mt-3 text-xs text-[#73718A]">
              Last updated{" "}
              <time dateTime={snapshot.lastUpdatedAt}>
                {reportingDateFormatter.format(
                  new Date(snapshot.lastUpdatedAt),
                )}
              </time>{" "}
              (Asia/Manila)
            </p>
          ) : null}
        </DashboardPanel>

        <DashboardPanel
          title="Workforce & Shift Coverage"
          icon={<LuUsersRound size={20} />}
        >
          <DashboardUnavailableState
            title="Workforce data unavailable"
            message="Employee, department, shift schedule, and staffing target records are not configured. Headcount and coverage cannot be calculated."
          />
        </DashboardPanel>

        <DashboardPanel title="Overtime & Labor Costs" icon={<LuClock3 size={20} />}>
          <DashboardUnavailableState
            title="Overtime data unavailable"
            message="Overtime requests, approvals, recorded hours, and authoritative labor-cost calculations are not configured."
          />
        </DashboardPanel>

        <DashboardActivitiesPanel
          state={activityState}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />

        <DashboardPanel
          title="Pending Approvals"
          icon={<LuBriefcaseBusiness size={20} />}
        >
          <DashboardUnavailableState
            title="Approvals unavailable"
            message="No administrative approval workflow records are available. No pending count is inferred."
          />
        </DashboardPanel>

        <DashboardPanel
          title="Compliance & Security Alerts"
          icon={<LuShieldCheck size={20} />}
          className="xl:col-span-2"
        >
          <DashboardUnavailableState
            title="Compliance and alerts unavailable"
            message="Verified compliance processing statuses and configured alert evidence are not available."
          />
        </DashboardPanel>
      </div>
    </section>
  );
}

export default function AdminDashboardClient({
  greeting,
  snapshotDate,
}: {
  greeting: string;
  snapshotDate: string;
}) {
  const [state, setState] = useState<DashboardSnapshotState>({
    status: "loading",
  });
  const activeRequest = useRef<AbortController | null>(null);

  const refreshSnapshot = useCallback(async () => {
    if (activeRequest.current) return;

    const controller = new AbortController();
    activeRequest.current = controller;
    setState((previous) =>
      previous.status === "loaded"
        ? { ...previous, refreshing: true }
        : previous.status === "error" && previous.snapshot
          ? {
              status: "loaded",
              snapshot: previous.snapshot,
              refreshing: true,
            }
          : { status: "loading" },
    );

    try {
      setState({
        status: "loaded",
        snapshot: await fetchDashboardSnapshot(fetch, controller.signal),
        refreshing: false,
      });
    } catch {
      if (!controller.signal.aborted) {
        setState((previous) => ({
          status: "error",
          ...(previous.status === "loaded" ? { snapshot: previous.snapshot } : {}),
        }));
      }
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(
      () => void refreshSnapshot(),
      0,
    );
    const stopPolling = startDashboardPolling({
      onRefresh: refreshSnapshot,
      documentRef: document,
      setIntervalFn: window.setInterval.bind(window),
      clearIntervalFn: window.clearInterval.bind(window),
    });

    return () => {
      window.clearTimeout(initialLoad);
      stopPolling();
      activeRequest.current?.abort();
      activeRequest.current = null;
    };
  }, [refreshSnapshot]);

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17152D] sm:text-[28px]">
            {greeting}
          </h1>
          <p className="mt-1 text-sm text-[#73718A]">
            Here&apos;s the company overview and key operations today.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[#EDEAF6] bg-white px-3 py-2 text-sm shadow-sm">
          <LuCalendarDays aria-hidden="true" className="text-[#73718A]" />
          <span>Snapshot date: {snapshotDate}</span>
        </div>
      </header>

      <section aria-label="Dashboard overview">
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ProjectedPayrollCard />
          <TotalEmployeesCard />
          <DepartmentsCard />
        </div>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <PayrollExpenseChart />
          <AttendanceSummaryChart />
        </div>
      </section>

      <DashboardSnapshotView state={state} onRefresh={() => void refreshSnapshot()} />
    </>
  );
}
