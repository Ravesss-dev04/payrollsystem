"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  classifySessionCheck,
  getSessionRetryDelay,
} from "../lib/auth/session-recovery";

type ConnectionState = "connected" | "offline" | "recovering" | "paused";
const MAX_AUTOMATIC_RETRIES = 8;

export default function SessionRecoveryStatus() {
  const router = useRouter();
  const [state, setState] = useState<ConnectionState>("connected");
  const retryCount = useRef(0);
  const lastCheckAt = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const retryNow = useRef<() => void>(() => {});

  useEffect(() => {
    let active = true;

    function scheduleRetry(retryAfter: string | null) {
      if (!active || retryTimer.current) return;
      if (retryCount.current >= MAX_AUTOMATIC_RETRIES) {
        setState("paused");
        return;
      }
      const retryAfterSeconds = Number(retryAfter);
      const delay =
        Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
          ? Math.min(retryAfterSeconds * 1000, 60_000)
          : getSessionRetryDelay(retryCount.current);
      retryCount.current += 1;
      retryTimer.current = setTimeout(() => {
        retryTimer.current = null;
        void checkSession(true);
      }, delay);
    }

    function checkSession(force = false): Promise<void> {
      if (!navigator.onLine) {
        setState("offline");
        return Promise.resolve();
      }
      if (inFlight.current) return inFlight.current;
      if (!force && Date.now() - lastCheckAt.current < 15_000) {
        return Promise.resolve();
      }

      setState("recovering");
      const controller = new AbortController();
      controllerRef.current = controller;
      lastCheckAt.current = Date.now();
      const timeout = setTimeout(() => controller.abort(), 8_000);
      const request = fetch("/api/auth/session", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      })
        .then((response) => {
          if (!active) return;
          const classification = classifySessionCheck(response.status);
          if (classification === "unauthenticated") {
            if (!window.location.pathname.startsWith("/login")) {
              router.replace("/login?reason=session-expired");
            } else {
              setState("connected");
            }
            return;
          }
          if (classification === "authenticated") {
            retryCount.current = 0;
            setState("connected");
            return;
          }
          setState("recovering");
          scheduleRetry(response.headers.get("retry-after"));
        })
        .catch(() => {
          if (!active) return;
          setState(navigator.onLine ? "recovering" : "offline");
          scheduleRetry(null);
        })
        .finally(() => {
          clearTimeout(timeout);
          if (controllerRef.current === controller) {
            controllerRef.current = null;
          }
          inFlight.current = null;
        });
      inFlight.current = request;
      return request;
    }

    function onOffline() {
      setState("offline");
    }

    function onOnline() {
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
      retryCount.current = 0;
      void checkSession(true);
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void checkSession(true);
      }
    }

    retryNow.current = () => {
      retryCount.current = 0;
      void checkSession(true);
    };

    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("payroll-session")
        : null;
    if (channel) {
      channel.onmessage = (event: MessageEvent<unknown>) => {
        if (
          typeof event.data === "object" &&
          event.data !== null &&
          "type" in event.data &&
          event.data.type === "session-invalidated"
        ) {
          void checkSession(true);
        }
      };
    }

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibilityChange);
    void checkSession();

    return () => {
      active = false;
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (retryTimer.current) clearTimeout(retryTimer.current);
      controllerRef.current?.abort();
      channel?.close();
      retryNow.current = () => {};
    };
  }, [router]);

  if (state === "connected") return null;
  return (
    <div
      role="status"
      className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950"
    >
      {state === "offline"
        ? "You are offline. Your session has not been cleared."
        : state === "paused"
          ? "The server is still unavailable. Your session is preserved; check your connection and retry."
          : "Connection interrupted. Your session is being revalidated; access remains subject to server checks."}
      {state === "paused" && (
        <button
          type="button"
          onClick={() => retryNow.current()}
          className="ml-2 underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}
