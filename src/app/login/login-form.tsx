"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";

export function LoginForm({ initialError = false }: { initialError?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(false);
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) {
      setLoading(false);
      setError(true);
      return;
    }
    // Poll until the session cookie is actually established server-side, then
    // hard-navigate. This prevents the intermittent race where "/" renders
    // before the cookie is readable and bounces back to /login.
    for (let i = 0; i < 25; i++) {
      const session = await getSession();
      if (session?.user?.id) break;
      await new Promise((r) => setTimeout(r, 120));
    }
    window.location.assign("/");
  }

  return (
    <form onSubmit={onSubmit}>
      {error && (
        <div className="mb-3 rounded-[10px] bg-[#fdecea] px-3 py-2 text-[12.5px] text-[#c23b2a]">
          Invalid email or password.
        </div>
      )}
      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-semibold text-slate">
          Email
        </label>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="w-full rounded-[10px] border border-line px-3 py-2.5 outline-none focus:border-teal"
        />
      </div>
      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-semibold text-slate">
          Password
        </label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-[10px] border border-line px-3 py-2.5 outline-none focus:border-teal"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="mt-1 w-full rounded-[12px] bg-teal py-3 font-semibold text-white hover:bg-teal-dark disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <div className="mt-3.5 text-center text-[12.5px]">
        <a className="font-semibold text-teal-dark" href="/forgot-password">
          Forgot password?
        </a>
      </div>
    </form>
  );
}
