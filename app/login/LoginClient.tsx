"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
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
  const [code, setCode] = useState("");
  const [mfaMethod, setMfaMethod] =
    useState<MfaVerificationMethod>("totp");
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
        router.push(result.user?.role === "employee" ? "/account" : "/admin/dashboard");
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
        body: JSON.stringify(
          buildMfaVerificationPayload(mfaMethod, code),
        ),
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
        router.push("/admin/dashboard");
      }
    } catch {
      setError("Verification is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#F7F6FF] p-4 text-[#17152D]">
      <section className="w-full max-w-md rounded-2xl bg-white p-7 shadow-lg">
        <h1 className="text-2xl font-bold">Payroll System</h1>
        {step === "login" && (
          <>
            <p className="mt-2 text-sm text-[#73718A]">Sign in to continue.</p>
            <form className="mt-6 space-y-4" onSubmit={submitLogin}>
              <label className="block text-sm font-medium">
                Email
                <input
                  type="email"
                  autoComplete="username"
                  required
                  maxLength={320}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D8D5E4] px-3 py-2.5"
                />
              </label>
              <label className="block text-sm font-medium">
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D8D5E4] px-3 py-2.5"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-purple-700 px-4 py-2.5 font-semibold text-white disabled:opacity-60"
              >
                {busy ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </>
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
                <code className="mt-2 block break-all text-xs">{setupUri}</code>
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
                  setMfaMethod(
                    mfaMethod === "totp" ? "recovery" : "totp",
                  );
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
              onClick={() => router.push("/admin/dashboard")}
              className="mt-5 w-full rounded-lg bg-purple-700 px-4 py-2.5 font-semibold text-white"
            >
              I saved these codes
            </button>
          </>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
