import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/utils";

export function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRequestOtp(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const resp = await apiFetch("/api/user/auth/request-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
        redirectOn401: false,
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Unable to send code.");
        return;
      }
      setStep(2);
    } catch (err) {
      setError("Unable to send code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const resp = await apiFetch("/api/user/auth/verify", {
        method: "POST",
        body: JSON.stringify({ email, code }),
        redirectOn401: false,
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Invalid code.");
        return;
      }
      localStorage.setItem("crackd_user_token", data.token);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError("Unable to verify code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex flex-col justify-between border-b border-stone-200 bg-stone-950 px-6 py-8 text-stone-50 lg:border-b-0 lg:border-r lg:px-10 lg:py-10">
        <div>
          <Link to="/" className="font-heading text-lg font-semibold tracking-tight">
            crackd.fyi
          </Link>
        </div>
        <div className="max-w-xl py-12 lg:py-0">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-400">
            Sign in
          </p>
          <h1 className="mt-4 font-heading text-4xl font-semibold leading-tight sm:text-5xl">
            Stay focused on the work that moves you closer to the offer.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-stone-300">
            Use a one-time code sent to your email. No password to manage, no admin console in the way.
          </p>
        </div>
        <div className="text-sm text-stone-400">
          Interview prep from real signals, not generic advice.
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div>
            <h2 className="font-heading text-2xl font-semibold text-stone-950">
              {step === 1 ? "Enter your email" : "Enter your code"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {step === 1
                ? "We’ll send you a 6-digit sign-in code."
                : `We sent a 6-digit code to ${email}.`}
            </p>
          </div>

          {step === 1 ? (
            <form className="mt-6 space-y-4" onSubmit={handleRequestOtp}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-stone-700">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-3 text-sm text-stone-950 outline-none transition focus:border-stone-500"
                  placeholder="you@example.com"
                  required
                />
              </label>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-stone-950 px-4 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {loading ? "Sending..." : "Send code"}
              </button>
            </form>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleVerifyOtp}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-stone-700">One-time code</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-3 text-center text-2xl tracking-[0.3em] text-stone-950 outline-none transition focus:border-stone-500"
                  placeholder="000000"
                  required
                />
              </label>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-stone-950 px-4 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {loading ? "Verifying..." : "Verify code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setCode("");
                  setError("");
                }}
                className="text-sm font-medium text-stone-600 transition hover:text-stone-950"
              >
                Back
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
