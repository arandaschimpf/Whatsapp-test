"use client";

import { useEffect, useMemo, useState } from "react";

type RegistrationResponse = {
  userId: string;
  name: string;
  phoneNumber: string;
  otp: string;
  status: "pending" | "verified";
  message: string;
  waLink: string;
};

type UserStatusResponse = {
  userId: string;
  name: string;
  phoneNumber: string;
  status: "pending" | "verified";
  createdAt: string | null;
  verifiedAt: string | null;
};

const MAX_AUTO_REFRESHES = 12;

export function RegistrationFlow() {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registration, setRegistration] = useState<RegistrationResponse | null>(null);
  const [status, setStatus] = useState<UserStatusResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshCount, setAutoRefreshCount] = useState(0);

  const statusText = useMemo(() => status?.status ?? registration?.status ?? "pending", [registration, status]);

  async function refreshStatus(userId: string) {
    setIsRefreshing(true);

    try {
      const response = await fetch(`/api/users/${userId}`, { cache: "no-store" });
      const payload = (await response.json()) as UserStatusResponse | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Unable to refresh status.");
      }

      setStatus(payload);
      setError(null);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Unable to refresh status.");
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    if (!registration?.userId || statusText === "verified" || autoRefreshCount >= MAX_AUTO_REFRESHES) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setAutoRefreshCount((currentCount) => currentCount + 1);
      void refreshStatus(registration.userId);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [autoRefreshCount, registration?.userId, statusText]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setStatus(null);
    setAutoRefreshCount(0);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phoneNumber,
        }),
      });
      const payload = (await response.json()) as RegistrationResponse | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Unable to register user.");
      }

      setRegistration(payload);
      await refreshStatus(payload.userId);
    } catch (submitError) {
      setRegistration(null);
      setError(submitError instanceof Error ? submitError.message : "Unable to register user.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-3xl border border-black/10 bg-white p-8 shadow-sm shadow-black/5">
        <div className="mb-8 space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">WhatsApp OTP login</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Register first, then prove phone ownership inside WhatsApp.</h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            This demo stores users in Firebase from the backend only. After signup, the user sends a prefilled WhatsApp message containing the generated user ID and OTP to your business number.
          </p>
        </div>

        <form className="grid gap-5" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Name
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-500 focus:bg-white"
              name="name"
              placeholder="Ada Lovelace"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Phone number
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-500 focus:bg-white"
              name="phoneNumber"
              placeholder="+1 555 123 4567"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              required
            />
          </label>

          <button
            className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Creating verification request..." : "Register and generate OTP"}
          </button>
        </form>

        {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      </section>

      <aside className="space-y-6 rounded-3xl border border-black/10 bg-slate-950 p-8 text-slate-100 shadow-sm shadow-black/5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Flow</p>
          <ol className="mt-4 grid gap-3 text-sm leading-6 text-slate-300">
            <li>1. Create a pending user record in Firebase.</li>
            <li>2. Open the wa.me link on the same phone number that registered.</li>
            <li>3. Send the message and wait for the webhook to mark the user as verified.</li>
          </ol>
        </div>

        {registration ? (
          <div className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="grid gap-1 text-sm text-slate-300">
              <p>
                <span className="font-semibold text-white">User ID:</span> {registration.userId}
              </p>
              <p>
                <span className="font-semibold text-white">OTP:</span> {registration.otp}
              </p>
              <p>
                <span className="font-semibold text-white">Registered phone:</span> {registration.phoneNumber}
              </p>
            </div>

            <textarea
              className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none"
              readOnly
              value={registration.message}
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                href={registration.waLink}
                rel="noreferrer"
                target="_blank"
              >
                Open wa.me verification link
              </a>

              <button
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:text-slate-400"
                disabled={isRefreshing}
                onClick={() => void refreshStatus(registration.userId)}
                type="button"
              >
                {isRefreshing ? "Refreshing..." : "Refresh status"}
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm">
              <p className="font-semibold text-white">Verification status</p>
              <p className={statusText === "verified" ? "mt-1 text-emerald-300" : "mt-1 text-amber-300"}>
                {statusText === "verified"
                  ? `Verified${status?.verifiedAt ? ` at ${new Date(status.verifiedAt).toLocaleString()}` : ""}`
                  : autoRefreshCount >= MAX_AUTO_REFRESHES
                    ? "Still pending. Automatic polling stopped after 1 minute; use Refresh status to check again."
                    : "Pending. Send the WhatsApp message, then wait for the webhook callback."}
              </p>
            </div>
          </div>
        ) : (
          <p className="rounded-3xl border border-dashed border-white/15 px-5 py-8 text-sm leading-6 text-slate-400">
            Once a user registers, this panel will show the generated OTP, the WhatsApp deep link, and the real-time verification status.
          </p>
        )}
      </aside>
    </div>
  );
}
