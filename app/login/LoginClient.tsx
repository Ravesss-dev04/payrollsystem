"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  LuActivity,
  LuCalendarCheck,
  LuCircleAlert,
  LuClock3,
  LuEye,
  LuEyeOff,
  LuFileText,
  LuLayers,
  LuLockKeyhole,
  LuMail,
  LuShieldCheck,
  LuUsers,
  LuWallet,
} from "react-icons/lu";
import {
  buildMfaVerificationPayload,
  type MfaVerificationMethod,
} from "./mfa-verification";

type LoginResponse = {
  authenticated?: boolean;
  mfaRequired?: boolean;
  setupRequired?: boolean;
  user?: { role: string };
};

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"login" | "mfa" | "recovery">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem("workpulse-remembered-email");
        if (saved) {
          setEmail(saved);
          setRememberEmail(true);
        }
      } catch {
        /* Storage is optional. */
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const [code, setCode] = useState("");
  const [mfaMethod, setMfaMethod] = useState<MfaVerificationMethod>("totp");
  const [setupUri, setSetupUri] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [setupRequired, setSetupRequired] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      try {
        if (rememberEmail)
          localStorage.setItem("workpulse-remembered-email", email);
        else localStorage.removeItem("workpulse-remembered-email");
      } catch {
        /* Sign-in remains available without browser storage. */
      }
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
      });
      const result = (await response.json()) as LoginResponse;
      if (!response.ok) {
        setError("Sign-in failed. Check your credentials or try again later.");
      } else if (result.mfaRequired) {
        const mustSetup = result.setupRequired === true;
        setSetupRequired(mustSetup);
        if (mustSetup) {
          const setupResponse = await fetch("/api/auth/mfa/setup", {
            method: "POST",
            cache: "no-store",
          });
          if (!setupResponse.ok) {
            setError("Multi-factor setup could not be started.");
            return;
          }
          const setup = (await setupResponse.json()) as {
            otpauthUri?: string;
          };
          setSetupUri(setup.otpauthUri ?? "");
        }
        setStep("mfa");
      } else if (result.authenticated) {
        router.push(
          result.user?.role === "hr" ? "/hr/dashboard" : result.user?.role === "employee" ? "/account" : "/admin/dashboard",
        );
      } else {
        setError("Sign-in could not be completed.");
      }
    } catch {
      setError("Sign-in is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  }

  async function submitMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildMfaVerificationPayload(mfaMethod, code)),
        cache: "no-store",
      });
      const result = (await response.json()) as {
        authenticated?: boolean;
        recoveryCodes?: string[];
      };
      if (!response.ok || !result.authenticated) {
        setError("Verification failed. Check the code or try again.");
      } else if (setupRequired && result.recoveryCodes?.length) {
        setRecoveryCodes(result.recoveryCodes);
        setStep("recovery");
      } else {
        router.push("/");
      }
    } catch {
      setError("Verification is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#faf8ff] text-[#17152d] lg:grid lg:grid-cols-[54%_46%]">
      <section
        className="relative hidden min-h-dvh overflow-hidden bg-[#171438] px-[7%] pt-[8vh] text-white lg:flex lg:flex-col"
        aria-label="WorkPulse HR overview"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_85%,#7042ac_0%,#292059_38%,#171438_75%)]" />
        <div className="relative z-10">
          <h1 className="text-[clamp(2.4rem,3.8vw,3.6rem)] leading-[1.08] font-bold tracking-[-0.04em]">
            Every <span className="text-[#b99af8]">workday</span> counts.
          </h1>
          <p className="mt-4 text-[clamp(1rem,1.35vw,1.25rem)] text-[#d8d0ec]">
            From attendance to payroll, every detail matters.
          </p>
          <div className="mt-7 flex flex-wrap gap-2 text-xs font-medium text-[#f1eaff] xl:gap-3">
            <span className="flex items-center gap-2 rounded-full border border-[#8565c3] bg-[#7653a6]/20 px-3 py-2">
              <LuShieldCheck className="text-lg text-[#c6a7ff]" /> Secure
              role-based access
            </span>
            <span className="flex items-center gap-2 rounded-full border border-[#8565c3] bg-[#7653a6]/20 px-3 py-2">
              <LuLayers className="text-lg text-[#c6a7ff]" /> Payroll &amp;
              workforce management
            </span>
            <span className="flex items-center gap-2 rounded-full border border-[#8565c3] bg-[#7653a6]/20 px-3 py-2">
              <LuUsers className="text-lg text-[#c6a7ff]" />  HR 
              Employee
            </span>
          </div>
        </div>
        <div
          className="relative z-0 mt-8 flex min-h-0 flex-1 items-center justify-center pb-12"
          aria-hidden="true"
        >
          <div className="absolute inset-x-[-15%] bottom-0 h-1/3 bg-[linear-gradient(to_top,#a77bda55,transparent)]" />
          <div className="absolute inset-x-[-10%] bottom-0 flex h-[28%] items-end justify-around opacity-25">
            {[32, 55, 40, 75, 48, 65, 36, 70, 44, 58, 30].map((height, i) => (
              <div
                key={i}
                className="w-[7%] border-t-2 border-[#d9c0ff] bg-[#b28be6]"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          <div className="relative w-[90%] max-w-[610px]">
            <div className="absolute -left-5 top-[20%] z-20 rounded-2xl border border-[#c3a0ff] bg-gradient-to-br from-[#aa79ed] to-[#5e2ba6] p-3 text-2xl shadow-[0_0_30px_#b78cff88]">
              <LuCalendarCheck />
            </div>
            <div className="absolute -left-3 bottom-[15%] z-20 rounded-2xl border border-[#c3a0ff] bg-gradient-to-br from-[#aa79ed] to-[#5e2ba6] p-3 text-2xl shadow-[0_0_30px_#b78cff88]">
              <LuClock3 />
            </div>
            <div className="absolute -right-3 -top-5 z-20 rounded-2xl border border-[#c3a0ff] bg-gradient-to-br from-[#aa79ed] to-[#5e2ba6] p-3 text-2xl shadow-[0_0_30px_#b78cff88]">
              <LuUsers />
            </div>
            <div className="rounded-t-[22px] border-2 border-[#a87be0] bg-[#211a4c] p-3 shadow-[0_20px_70px_#100b2e]">
              <div className="rounded-xl bg-[#171432] p-3 sm:p-4">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <LuActivity className="rounded bg-[#762be3] p-1 text-2xl" />{" "}
                  WorkPulse HR
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {["Admin", "HR", "Employee"].map((role) => (
                    <div
                      key={role}
                      className="rounded-lg bg-[#e6dafa] py-3 text-center text-xs font-bold text-[#39235e]"
                    >
                      <LuUsers className="mx-auto mb-1 text-lg text-[#7c3aed]" />
                      {role}
                    </div>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[#30244d]">
                  {[
                    ["Attendance", "Workdays recorded"],
                    ["Payroll", "Prepare payroll"],
                    ["Workforce", "People & teams"],
                    ["Payslips", "Ready to review"],
                  ].map(([title, caption], i) => (
                    <div key={title} className="rounded-lg bg-[#f4efff] p-3">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        {i === 0 ? (
                          <LuCalendarCheck />
                        ) : i === 1 ? (
                          <LuWallet />
                        ) : i === 2 ? (
                          <LuUsers />
                        ) : (
                          <LuFileText />
                        )}
                        {title}
                      </div>
                      <p className="mt-2 text-[10px] text-[#817493]">
                        {caption}
                      </p>
                      <div className="mt-2 h-1 w-2/3 rounded bg-[#d8c7f3]" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mx-[-4%] h-4 rounded-b-[50%] bg-gradient-to-b from-[#c5a7f0] to-[#5a3a94] shadow-[0_10px_25px_#b388e066]" />
            <div className="absolute -right-6 bottom-[12%] z-20 w-24 rotate-6 rounded-lg bg-[#f5efff] p-3 text-[#49316d] shadow-xl">
              <LuFileText className="text-xl text-[#7c3aed]" />
              <p className="mt-1 text-xs font-bold">Payslip</p>
              <div className="mt-2 h-1 rounded bg-[#c9b2e8]" />
              <div className="mt-2 h-1 w-3/4 rounded bg-[#c9b2e8]" />
              <div className="mt-2 h-1 w-1/2 rounded bg-[#c9b2e8]" />
            </div>
          </div>
        </div>
      </section>
      <section className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8 sm:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 top-20 h-80 w-80 rounded-full bg-[#ede5fa]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-48 -right-20 h-80 w-96 rounded-full bg-[#f0e9fb]"
        />
        <div className="relative w-full max-w-[500px]">
          <div className="mb-7 flex items-center gap-3 text-2xl font-bold tracking-tight sm:mb-9 sm:text-3xl">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[#a343fa] to-[#5e00bd] text-white shadow-md">
              <LuActivity />
            </span>
            WorkPulse <span className="-ml-2 text-[#7619d4]">HR</span>
          </div>
          <section className="rounded-2xl border border-[#f0ecf7] bg-white p-6 shadow-[0_14px_45px_#45306b12] sm:p-9">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[30px] leading-tight font-bold tracking-tight">
                  {step === "login"
                    ? "Welcome back"
                    : step === "mfa"
                      ? "Verify your identity"
                      : "Recovery codes"}
                </h2>
                {step === "login" && (
                  <p className="mt-2 text-sm text-[#73718a] sm:text-base">
                    Sign in to your WorkPulse HR account.
                  </p>
                )}
              </div>
              <div
                aria-hidden="true"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#f1e8ff] text-2xl text-[#7c3aed]"
              >
                <LuShieldCheck />
              </div>
            </div>
            {step === "login" && (
              <form className="mt-7 space-y-5" onSubmit={submitLogin}>
                <label className="block text-sm font-semibold">
                  Work Email
                  <span className="relative mt-2 block">
                    <LuMail
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-lg text-[#817b9f]"
                    />
                    <input
                      type="email"
                      autoComplete="username"
                      required
                      maxLength={320}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Enter your work email"
                      className="h-[52px] w-full rounded-xl border border-[#ded9ec] bg-white pr-4 pl-11 font-normal outline-none transition focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/20"
                    />
                  </span>
                </label>
                <label className="block text-sm font-semibold">
                  Password
                  <span className="relative mt-2 block">
                    <LuLockKeyhole
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-lg text-[#817b9f]"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      maxLength={128}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      className="h-[52px] w-full rounded-xl border border-[#ded9ec] bg-white pr-12 pl-11 font-normal outline-none transition focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/20"
                    />
                    <button
                      type="button"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 grid w-12 place-items-center text-[#817b9f] focus-visible:outline-2 focus-visible:outline-purple-600"
                    >
                      {showPassword ? <LuEyeOff /> : <LuEye />}
                    </button>
                  </span>
                </label>
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <label className="flex min-h-10 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rememberEmail}
                      onChange={(event) =>
                        setRememberEmail(event.target.checked)
                      }
                      className="h-4 w-4 accent-[#7c3aed]"
                    />{" "}
                    Remember email
                  </label>
                  <span className="text-[#73718a]">
                    Need help?
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#7c3aed] font-semibold text-white transition hover:bg-[#6d28d9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 disabled:opacity-60"
                >
                  {busy ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" />{" "}
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LuLockKeyhole /> Sign In Securely
                    </>
                  )}
                </button>
              </form>
            )}
            {step === "mfa" && (
              <>
                <p className="mt-2 text-sm text-[#73718A]">
                  {mfaMethod === "recovery"
                    ? "Enter one of your saved recovery codes. Each code can be used once."
                    : setupRequired
                      ? "Add this account to an authenticator app, then enter its six-digit code."
                      : "Enter the six-digit code from your authenticator app."}
                </p>
                {setupUri && (
                  <details className="mt-4 rounded-lg bg-[#F7F6FF] p-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      Show authenticator setup key
                    </summary>
                    <code className="mt-2 block break-all text-xs">
                      {setupUri}
                    </code>
                  </details>
                )}
                <form className="mt-5 space-y-4" onSubmit={submitMfa}>
                  <label className="block text-sm font-medium">
                    {mfaMethod === "recovery"
                      ? "Recovery code"
                      : "Authentication code"}
                    <input
                      type="text"
                      inputMode={mfaMethod === "totp" ? "numeric" : "text"}
                      autoComplete="one-time-code"
                      pattern={
                        mfaMethod === "totp"
                          ? "[0-9]{6}"
                          : "([A-Fa-f0-9]{32}|[A-Fa-f0-9]{8}(-[A-Fa-f0-9]{8}){3})"
                      }
                      maxLength={mfaMethod === "totp" ? 6 : 35}
                      required
                      value={code}
                      onChange={(event) =>
                        setCode(
                          mfaMethod === "totp"
                            ? event.target.value.replace(/\D/g, "").slice(0, 6)
                            : event.target.value
                                .replace(/[^a-f\d-]/gi, "")
                                .slice(0, 35),
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-[#D8D5E4] px-3 py-2.5"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={
                      busy ||
                      (mfaMethod === "totp"
                        ? code.length !== 6
                        : code.length === 0)
                    }
                    className="w-full rounded-lg bg-purple-700 px-4 py-2.5 font-semibold text-white disabled:opacity-60"
                  >
                    {busy ? "Verifying..." : "Verify"}
                  </button>
                </form>
                {!setupRequired && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setCode("");
                      setError("");
                      setMfaMethod(mfaMethod === "totp" ? "recovery" : "totp");
                    }}
                    className="mt-4 w-full text-sm font-medium text-purple-700 underline disabled:opacity-60"
                  >
                    {mfaMethod === "totp"
                      ? "Use a recovery code instead"
                      : "Use an authenticator code instead"}
                  </button>
                )}
              </>
            )}
            {step === "recovery" && (
              <>
                <p className="mt-2 text-sm text-[#73718A]">
                  Save these recovery codes now. Each code can be used once.
                </p>
                <ul className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-[#F7F6FF] p-4 font-mono text-sm">
                  {recoveryCodes.map((recoveryCode) => (
                    <li key={recoveryCode}>{recoveryCode}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="mt-5 w-full rounded-lg bg-purple-700 px-4 py-2.5 font-semibold text-white"
                >
                  I saved these codes
                </button>
              </>
            )}
            {error && (
              <p
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                <LuCircleAlert className="mt-0.5 shrink-0" />
                {error}
              </p>
            )}
            <p className="mt-6 flex items-center justify-center gap-2 border-t border-[#edeaf6] pt-5 text-center text-xs text-[#77718d]">
              <LuShieldCheck className="text-base" /> Secure access for your
              workforce
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
