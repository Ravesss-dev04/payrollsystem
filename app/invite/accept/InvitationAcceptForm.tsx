"use client";

import { useEffect, useState } from "react";

type Props = {
  token: string;
  name: string;
  email: string;
  role: string;
  department: string;
};

export default function InvitationAcceptForm({
  token,
  name,
  email,
  role,
  department,
}: Props) {
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    window.history.replaceState(window.history.state, "", "/invite/accept");
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password, passwordConfirmation }),
        cache: "no-store",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(
          result.error === "password_policy"
            ? "Choose a stronger password with at least 12 characters."
            : result.error === "rate_limited"
              ? "Too many attempts. Please wait before trying again."
              : "This invitation is no longer available. Ask your administrator for a new invitation.",
        );
        return;
      }
      setComplete(true);
    } catch {
      setError("Account creation could not be confirmed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (complete) {
    return (
      <section
        role="status"
        className="rounded-2xl bg-white p-7 shadow-lg"
        aria-live="polite"
      >
        <h1 className="text-2xl font-bold">Account created</h1>
        <p className="mt-3 text-sm text-[#57556B]">
          Your account is ready. Sign in with {email} and the password you just
          created.
        </p>
        <a
          href="/login"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-[#6D3BE8] px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D3BE8]"
        >
          Continue to sign in
        </a>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-7 shadow-lg">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-2 text-sm text-[#57556B]">
        Review your invitation and set a password to activate your account.
      </p>
      <dl className="mt-5 grid gap-2 rounded-xl bg-[#F7F6FF] p-4 text-sm">
        <div>
          <dt className="inline font-medium">Name: </dt>
          <dd className="inline">{name}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Email: </dt>
          <dd className="inline">{email}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Role: </dt>
          <dd className="inline">{role}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Department: </dt>
          <dd className="inline">{department}</dd>
        </div>
      </dl>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium">
          Password
          <input
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-[#D8D5E4] px-3"
          />
        </label>
        <label className="block text-sm font-medium">
          Confirm password
          <input
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            value={passwordConfirmation}
            onChange={(event) =>
              setPasswordConfirmation(event.currentTarget.value)
            }
            className="mt-1 min-h-11 w-full rounded-lg border border-[#D8D5E4] px-3"
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 w-full rounded-lg bg-[#6D3BE8] px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>
    </section>
  );
}
