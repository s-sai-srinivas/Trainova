"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginTrainer, loginClient, registerTrainer } from "@/app/actions";
import { Phone, Lock, Eye, EyeOff, User, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"TRAINER" | "CLIENT">("TRAINER");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim() || loading) return;

    setLoading(true);
    setError(null);

    let res;
    if (isRegisterMode) {
      if (!name.trim()) {
        setError("Please enter your name.");
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }
      res = await registerTrainer(name.trim(), identifier.trim(), password);
    } else {
      if (role === "TRAINER") {
        res = await loginTrainer(identifier.trim(), password);
      } else {
        res = await loginClient(identifier.trim(), password);
      }
    }

    if (res.success) {
      if (role === "TRAINER" || isRegisterMode) {
        router.push("/trainer/dashboard");
      } else {
        router.push("/client/today");
      }
      router.refresh();
    } else {
      setError(res.error || (isRegisterMode ? "Registration failed." : "Login failed."));
      setLoading(false);
    }
  };

  return (
    <div 
      className="flex-col justify-center items-center" 
      style={{ 
        minHeight: "100vh", 
        backgroundColor: "var(--bg-primary)",
        padding: "16px",
        color: "var(--accent-white)"
      }}
    >
      <div 
        className="glass-card flex-col gap-md"
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "32px 24px",
          border: "1px solid var(--border-frosted)",
          backgroundColor: "var(--bg-surface-glass)"
        }}
      >
        {/* Branding Title */}
        <div className="flex-col items-center text-center gap-xs">
          <span 
            style={{ 
              fontFamily: "var(--font-heading)", 
              fontSize: "32px", 
              fontWeight: 800, 
              letterSpacing: "0.05em",
              textTransform: "uppercase"
            }}
          >
            Trainova
          </span>
          <span style={{ fontSize: "12px", color: "var(--accent-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {isRegisterMode ? "Coach registration" : "Coaching OS"}
          </span>
        </div>

        {/* Tab Selectors */}
        <div 
          className="flex-row"
          style={{
            backgroundColor: "var(--bg-primary)",
            borderRadius: "12px",
            padding: "4px",
            border: "1px solid var(--border-frosted)"
          }}
        >
          <button
            onClick={() => { setRole("TRAINER"); setError(null); setIdentifier(""); }}
            className="touch-action"
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: role === "TRAINER" ? "var(--accent-white)" : "transparent",
              color: role === "TRAINER" ? "var(--bg-primary)" : "var(--accent-muted)",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.15s ease-out"
            }}
          >
            COACH {isRegisterMode ? "SIGNUP" : "LOGIN"}
          </button>
          <button
            onClick={() => { setRole("CLIENT"); setError(null); setIsRegisterMode(false); setIdentifier(""); }}
            className="touch-action"
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: role === "CLIENT" ? "var(--accent-white)" : "transparent",
              color: role === "CLIENT" ? "var(--bg-primary)" : "var(--accent-muted)",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.15s ease-out"
            }}
          >
            ATHLETE LOGIN
          </button>
        </div>

        {error && (
          <div 
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid var(--status-red)",
              color: "var(--status-red)",
              padding: "12px",
              borderRadius: "12px",
              fontSize: "13px",
              textAlign: "center",
              fontWeight: 600
            }}
          >
            {error}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="flex-col gap-md">
          {/* Name Field (Register Mode only) */}
          {isRegisterMode && (
            <div className="flex-col gap-sm">
              <label style={{ fontSize: "11px", color: "var(--accent-muted)", fontWeight: 700, letterSpacing: "0.05em" }}>
                COACH NAME
              </label>
              <div style={{ position: "relative", width: "100%" }}>
                <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--accent-muted)", display: "flex", alignItems: "center" }}>
                  <User size={16} />
                </span>
                <input
                  type="text"
                  placeholder="e.g. Coach Karan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ paddingLeft: "42px", height: "48px", width: "100%" }}
                  required
                />
              </div>
            </div>
          )}

          <div className="flex-col gap-sm">
            <label style={{ fontSize: "11px", color: "var(--accent-muted)", fontWeight: 700, letterSpacing: "0.05em" }}>
              {isRegisterMode ? "PHONE NUMBER" : "EMAIL OR PHONE NUMBER"}
            </label>
            <div style={{ position: "relative", width: "100%" }}>
              <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--accent-muted)", display: "flex", alignItems: "center" }}>
                {isRegisterMode ? (
                  <Phone size={16} />
                ) : identifier.trim().includes("@") ? (
                  <Mail size={16} />
                ) : (
                  <Phone size={16} />
                )}
              </span>
              <input
                type="text"
                placeholder={
                  isRegisterMode
                    ? "e.g. +919876543210"
                    : role === "TRAINER"
                    ? "e.g. coach@trainova.com or +919876543210"
                    : "e.g. athlete@trainova.com or +919876543210"
                }
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                style={{ paddingLeft: "42px", height: "48px", width: "100%" }}
                required
              />
            </div>
          </div>

          <div className="flex-col gap-sm">
            <label style={{ fontSize: "11px", color: "var(--accent-muted)", fontWeight: 700, letterSpacing: "0.05em" }}>
              PASSWORD
            </label>
            <div style={{ position: "relative", width: "100%" }}>
              <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--accent-muted)", display: "flex", alignItems: "center" }}>
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: "42px", paddingRight: "46px", height: "48px", width: "100%" }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--accent-muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password Field (Register Mode only) */}
          {isRegisterMode && (
            <div className="flex-col gap-sm">
              <label style={{ fontSize: "11px", color: "var(--accent-muted)", fontWeight: 700, letterSpacing: "0.05em" }}>
                CONFIRM PASSWORD
              </label>
              <div style={{ position: "relative", width: "100%" }}>
                <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--accent-muted)", display: "flex", alignItems: "center" }}>
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ paddingLeft: "42px", paddingRight: "46px", height: "48px", width: "100%" }}
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-sm"
            style={{ 
              height: "48px", 
              fontSize: "14px", 
              fontWeight: 700, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              gap: "8px"
            }}
          >
            {loading 
              ? (isRegisterMode ? "Registering..." : "Authenticating...") 
              : (isRegisterMode ? "CREATE COACH ACCOUNT" : "CONTINUE TO PORTAL")
            }
          </button>
        </form>

        <div className="text-center" style={{ marginTop: "12px" }}>
          <span style={{ fontSize: "12px", color: "var(--accent-muted)" }}>
            {role === "TRAINER" 
              ? (isRegisterMode ? "Provide a name, phone, and password to sign up." : "Use your registered email/phone and password to sign in.")
              : "Use your registered email/phone and password to sign in."
            }
          </span>
        </div>

        {role === "TRAINER" && (
          <div className="text-center" style={{ marginTop: "16px", borderTop: "1px solid var(--border-frosted)", paddingTop: "16px" }}>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setError(null);
                setName("");
                setIdentifier("");
                setConfirmPassword("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent-white)",
                fontSize: "13px",
                textDecoration: "underline",
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              {isRegisterMode 
                ? "Already have a coach account? Log In" 
                : "Don't have a coach account? Register Here"
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
