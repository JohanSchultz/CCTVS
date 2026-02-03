"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

function MFAStep({ onSuccess }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) {
        throw factors.error;
      }

      const totpFactor = factors.data.totp[0];

      if (!totpFactor) {
        throw new Error("No authenticator app factor found for this account.");
      }

      const factorId = totpFactor.id;

      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) {
        setError(challenge.error.message);
        throw challenge.error;
      }

      const challengeId = challenge.data.id;

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: code.trim(),
      });

      if (verify.error) {
        // Covers invalid / expired codes
        setError(verify.error.message || "Invalid or expired code. Try again.");
        throw verify.error;
      }

      onSuccess();
    } catch (err) {
      console.error("MFA verification error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <p className="text-sm text-slate-200">
        Enter the 6-digit code from your authenticator app to finish signing in.
      </p>

      <div>
        <label className="block text-sm font-medium text-slate-100">
          Authenticator code
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-500/60 bg-slate-900/40 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="123 456"
        />
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <button
        type="submit"
        disabled={loading || !code}
        className="inline-flex w-full items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Verifying…" : "Verify and continue"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsMFA, setNeedsMFA] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setNeedsMFA(false);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      const { data, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError) {
        setError(aalError.message);
        return;
      }

      if (data.nextLevel === "aal2" && data.currentLevel !== data.nextLevel) {
        // MFA is enrolled but not yet verified in this session.
        setNeedsMFA(true);
        return;
      }

      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-blue-950 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6">
        <div className="w-full rounded-2xl bg-slate-900/60 p-6 shadow-xl ring-1 ring-slate-700/70">
          <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-slate-300">
            Use your email and password. If you have MFA enabled, we&apos;ll ask
            for a code as well.
          </p>

          {!needsMFA && (
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-100">
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-500/60 bg-slate-900/40 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-100">
                  Password
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-500/60 bg-slate-900/40 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && <p className="text-sm text-rose-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}

          {needsMFA && (
            <MFAStep
              onSuccess={() => {
                router.push("/");
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}

