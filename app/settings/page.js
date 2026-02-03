"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

function EnrollMFA({ onEnrolled, onCancel }) {
  const [factorId, setFactorId] = useState("");
  const [qr, setQR] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });

      if (error) {
        console.error("Error starting MFA enrollment:", error);
        if (!cancelled) {
          setError(error.message);
        }
        return;
      }

      if (cancelled) return;

      setFactorId(data.id);
      setQR(data.totp.qr_code);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleEnable(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) {
        setError(challenge.error.message);
        throw challenge.error;
      }

      const challengeId = challenge.data.id;

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: verifyCode.trim(),
      });

      if (verify.error) {
        setError(
          verify.error.message || "Invalid or expired code. Please try again."
        );
        throw verify.error;
      }

      onEnrolled();
    } catch (err) {
      console.error("Error verifying MFA enrollment:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleEnable} className="mt-4 space-y-4">
      {error && <p className="text-sm text-rose-500">{error}</p>}

      <p className="text-sm text-slate-800">
        Scan this QR code with your authenticator app (Google Authenticator,
        1Password, etc.), then enter the 6-digit code to confirm.
      </p>

      {qr && (
        <div className="flex justify-center">
          <img
            src={qr}
            alt="MFA enrollment QR code"
            className="h-40 w-40 rounded-lg bg-white p-2 shadow-sm"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-900">
          Verification code
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={verifyCode}
          onChange={(e) => setVerifyCode(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          placeholder="123 456"
          required
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !verifyCode}
          className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Enabling…" : "Enable MFA"}
        </button>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [factors, setFactors] = useState(null);
  const [loadingFactors, setLoadingFactors] = useState(false);
  const [error, setError] = useState("");
  const [showEnroll, setShowEnroll] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setCheckingAuth(false);
    })();
  }, [router]);

  useEffect(() => {
    if (checkingAuth) return;

    (async () => {
      setLoadingFactors(true);
      setError("");
      const res = await supabase.auth.mfa.listFactors();
      if (res.error) {
        setError(res.error.message);
      } else {
        setFactors(res.data);
      }
      setLoadingFactors(false);
    })();
  }, [checkingAuth, showEnroll]);

  const hasTotp =
    factors && Array.isArray(factors.totp) && factors.totp.length > 0;

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-blue-950 text-slate-50">
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-slate-200">Loading settings…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-blue-950 text-slate-50">
      <div className="mx-auto max-w-xl px-6 py-16">
        <div className="rounded-2xl bg-yellow-50 p-6 shadow-sm ring-1 ring-yellow-100 text-slate-900">
          <h1 className="text-xl font-semibold tracking-tight">
            Security settings
          </h1>
          <p className="mt-1 text-sm text-slate-700">
            Manage multi-factor authentication (MFA) for your account.
          </p>

          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-medium text-slate-900">
                  App authenticator (TOTP)
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Protect your account with a time-based one-time password from
                  an authenticator app like Google Authenticator, 1Password, or
                  Authy.
                </p>
              </div>
              <div className="shrink-0">
                {loadingFactors ? (
                  <span className="text-xs text-slate-500">Checking…</span>
                ) : hasTotp ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Enabled
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    Not enabled
                  </span>
                )}
              </div>
            </div>

            {!hasTotp && !showEnroll && (
              <button
                type="button"
                onClick={() => setShowEnroll(true)}
                className="mt-4 inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                Enable MFA
              </button>
            )}

            {showEnroll && !hasTotp && (
              <EnrollMFA
                onEnrolled={() => {
                  setShowEnroll(false);
                }}
                onCancel={() => setShowEnroll(false)}
              />
            )}

            {hasTotp && (
              <p className="mt-3 text-xs text-slate-600">
                MFA is enabled for this account. You will be asked for a 6-digit
                code when signing in.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

