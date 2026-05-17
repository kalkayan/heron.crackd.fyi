import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/utils";

const DOTS_BG = {
  background: "#F4F1EA",
  backgroundImage: "radial-gradient(circle, #D8D6CE 1px, transparent 1px)",
  backgroundSize: "16px 16px",
};

function Logo({ size = 15 }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: size,
        color: "#1A1A1A",
        fontFamily: "inherit",
        fontWeight: 600,
        letterSpacing: "-0.02em",
        textDecoration: "none",
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          background: "#D97757",
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      <span>
        crackd<span style={{ color: "#D97757" }}>.fyi</span>
      </span>
    </span>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Start as "checking" if a token exists so we never flash the form
  const [checking, setChecking] = useState(
    () => !!localStorage.getItem("crackd_user_token"),
  );

  useEffect(() => {
    const token = localStorage.getItem("crackd_user_token");
    if (!token) return;
    apiFetch("/api/user/auth/me")
      .then((resp) => {
        if (resp && resp.ok) {
          navigate("/dashboard", { replace: true });
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [navigate]);

  if (checking) return null;

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
    } catch {
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
        if (resp.status === 403 && data.error === "waitlist") {
          setStep("waitlist");
          return;
        }
        setError(data.error || "Invalid code.");
        return;
      }
      localStorage.setItem("crackd_user_token", data.token);
      navigate("/dashboard", { replace: true });
    } catch {
      setError("Unable to verify code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", ...DOTS_BG }}>
      {/* Header */}
      <header
        style={{
          padding: "26px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link to="/" style={{ textDecoration: "none" }}>
          <Logo size={15} />
        </Link>
        <span style={{ fontSize: 13, color: "#9A9A98" }}>
          No password — just your email.
        </span>
      </header>

      {/* Centered form */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 24px 80px",
          minHeight: "calc(100vh - 80px)",
        }}
      >
        <div style={{ width: "100%", maxWidth: 440 }}>
          {/* Card */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E5E2D8",
              borderRadius: 18,
              padding: "32px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 8px 28px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ marginBottom: 24 }}>
              <h1
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: "#1A1A1A",
                  margin: 0,
                  fontFamily: "Martel Sans, sans-serif",
                }}
              >
                {step === "waitlist"
                  ? "You're on the list"
                  : step === 1
                  ? "Sign in to crackd.fyi"
                  : "Check your inbox"}
              </h1>
              <p style={{ marginTop: 8, fontSize: 14, color: "#6B6B6B", lineHeight: 1.5 }}>
                {step === "waitlist"
                  ? "crackd.fyi is in early access. We'll email you when your spot is ready."
                  : step === 1
                  ? "Enter your email and we'll send you a 6-digit code."
                  : `We sent a code to ${email}. Paste it below.`}
              </p>
            </div>

            {step === "waitlist" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{
                  background: "#F9F7F3",
                  border: "1px solid #E5E2D8",
                  borderRadius: 12,
                  padding: "16px 18px",
                  fontSize: 13,
                  color: "#6B6B6B",
                  lineHeight: 1.6,
                }}>
                  <strong style={{ color: "#1A1A1A", display: "block", marginBottom: 4 }}>
                    We've got your email ✓
                  </strong>
                  We're rolling out access gradually to keep quality high. You'll hear from us at{" "}
                  <span style={{ color: "#1A1A1A", fontWeight: 600 }}>{email}</span> when you're in.
                </div>
                <button
                  type="button"
                  onClick={() => { setStep(1); setCode(""); setError(""); }}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    fontSize: 13,
                    color: "#6B6B6B",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "center",
                  }}
                >
                  ← Try a different email
                </button>
              </div>
            ) : step === 1 ? (
              <form onSubmit={handleRequestOtp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#1A1A1A",
                      marginBottom: 8,
                    }}
                  >
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    style={{
                      width: "100%",
                      background: "#FAFAF8",
                      border: "1px solid #E0DDD3",
                      borderRadius: 10,
                      padding: "12px 14px",
                      fontSize: 14,
                      color: "#1A1A1A",
                      outline: "none",
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#9A9A98")}
                    onBlur={(e) => (e.target.style.borderColor = "#E0DDD3")}
                  />
                </div>
                {error && (
                  <p style={{ fontSize: 13, color: "#C0392B", margin: 0 }}>{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    background: loading ? "#9A9A98" : "#1A1A1A",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 999,
                    padding: "13px 20px",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    transition: "background 0.15s",
                  }}
                >
                  {loading ? "Sending…" : "Send code"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#1A1A1A",
                      marginBottom: 8,
                    }}
                  >
                    One-time code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    required
                    style={{
                      width: "100%",
                      background: "#FAFAF8",
                      border: "1px solid #E0DDD3",
                      borderRadius: 10,
                      padding: "14px",
                      fontSize: 28,
                      fontWeight: 600,
                      letterSpacing: "0.3em",
                      color: "#1A1A1A",
                      outline: "none",
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                      textAlign: "center",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#9A9A98")}
                    onBlur={(e) => (e.target.style.borderColor = "#E0DDD3")}
                  />
                </div>
                {error && (
                  <p style={{ fontSize: 13, color: "#C0392B", margin: 0 }}>{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    background: loading ? "#9A9A98" : "#1A1A1A",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 999,
                    padding: "13px 20px",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    transition: "background 0.15s",
                  }}
                >
                  {loading ? "Verifying…" : "Verify code"}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep(1); setCode(""); setError(""); }}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    fontSize: 13,
                    color: "#6B6B6B",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "center",
                  }}
                >
                  ← Use a different email
                </button>
              </form>
            )}
          </div>

          <p style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "#9A9A98" }}>
            New here? Signing in creates your account automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
