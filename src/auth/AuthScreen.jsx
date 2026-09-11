import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

const COLORS = {
  bg: "#EDEAE3",
  surface: "#F7F5F0",
  ink: "#2B2A28",
  sub: "#7C7A72",
  moss: "#5E7350",
  clay: "#C08A42",
  line: "#D8D3C8",
};

export default function AuthScreen() {
  const [mode, setMode] = useState("password"); // "password" | "magic"
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(null); // { type: "error"|"info", text }
  const [busy, setBusy] = useState(false);

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setStatus(null);
    setBusy(true);
    try {
      const { error } = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (isSignUp) {
        setStatus({ type: "info", text: "Check your email to confirm your account, then sign in." });
      }
    } catch (err) {
      setStatus({ type: "error", text: err.message || "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  async function handleMagicLink(e) {
    e.preventDefault();
    setStatus(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setStatus({ type: "info", text: "Magic link sent — check your email." });
    } catch (err) {
      setStatus({ type: "error", text: err.message || "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setStatus(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      // Browser redirects away here; no further code runs.
    } catch (err) {
      setStatus({ type: "error", text: err.message || "Something went wrong." });
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: COLORS.bg,
        fontFamily: "system-ui",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          background: COLORS.surface,
          borderRadius: 20,
          padding: 28,
          boxShadow: "0 20px 60px rgba(43,42,40,0.12)",
          border: `1px solid ${COLORS.line}`,
        }}
      >
        <h1 style={{ fontFamily: "'Iowan Old Style','Palatino Linotype',Georgia,serif", fontSize: 22, color: COLORS.ink, margin: "0 0 4px" }}>
          Focus Timer
        </h1>
        <p style={{ color: COLORS.sub, fontSize: 13, margin: "0 0 20px" }}>
          {mode === "password" ? (isSignUp ? "Create an account to sync your data." : "Sign in to your account.") : "We'll email you a one-time sign-in link."}
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${COLORS.line}`,
            background: "#fff",
            color: COLORS.ink,
            fontSize: 14,
            cursor: "pointer",
            marginBottom: 16,
          }}
        >
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 16px" }}>
          <div style={{ flex: 1, height: 1, background: COLORS.line }} />
          <span style={{ fontSize: 11, color: COLORS.sub }}>or</span>
          <div style={{ flex: 1, height: 1, background: COLORS.line }} />
        </div>

        <form onSubmit={mode === "password" ? handlePasswordSubmit : handleMagicLink}>
          <label style={{ display: "block", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              width: "100%",
              padding: "9px 10px",
              borderRadius: 8,
              border: `1px solid ${COLORS.line}`,
              marginBottom: 12,
              fontSize: 14,
              boxSizing: "border-box",
            }}
          />

          {mode === "password" && (
            <>
              <label style={{ display: "block", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "9px 10px",
                  borderRadius: 8,
                  border: `1px solid ${COLORS.line}`,
                  marginBottom: 12,
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </>
          )}

          {status && (
            <div
              style={{
                fontSize: 12.5,
                color: status.type === "error" ? "#B5502F" : COLORS.moss,
                background: status.type === "error" ? "#F7E9E3" : "#EAF0E4",
                borderRadius: 8,
                padding: "8px 10px",
                marginBottom: 12,
              }}
            >
              {status.text}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "none",
              background: COLORS.moss,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 12,
            }}
          >
            {mode === "password" ? (isSignUp ? "Sign up" : "Sign in") : "Send magic link"}
          </button>
        </form>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
          {mode === "password" ? (
            <button type="button" onClick={() => setIsSignUp((v) => !v)} style={linkBtn(COLORS)}>
              {isSignUp ? "Have an account? Sign in" : "New here? Create an account"}
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => {
              setStatus(null);
              setMode((m) => (m === "password" ? "magic" : "password"));
            }}
            style={linkBtn(COLORS)}
          >
            {mode === "password" ? "Use magic link instead" : "Use password instead"}
          </button>
        </div>
      </div>
    </div>
  );
}

function linkBtn(COLORS) {
  return {
    background: "none",
    border: "none",
    color: COLORS.clay,
    fontSize: 12.5,
    cursor: "pointer",
    padding: 0,
  };
}
