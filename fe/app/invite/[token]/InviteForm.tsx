"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { claimInvite } from "@/app/actions";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

interface InviteFormProps {
  token: string;
  defaultEmail: string;
}

export default function InviteForm({ token, defaultEmail }: InviteFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !confirmPassword || loading) return;

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await claimInvite(token, email.trim(), password);

    if (res.success) {
      router.push("/client/today");
      router.refresh();
    } else {
      setError(res.error || "Failed to activate your account. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex-col gap-md">
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

      <div className="flex-col gap-sm">
        <label style={{ fontSize: "11px", color: "var(--accent-muted)", fontWeight: 700, letterSpacing: "0.05em" }}>
          EMAIL ADDRESS
        </label>
        <div style={{ position: "relative", width: "100%" }}>
          <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--accent-muted)", display: "flex", alignItems: "center" }}>
            <Mail size={16} />
          </span>
          <input
            type="email"
            placeholder="e.g. client@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ paddingLeft: "42px", height: "48px", width: "100%" }}
            required
          />
        </div>
      </div>

      <div className="flex-col gap-sm">
        <label style={{ fontSize: "11px", color: "var(--accent-muted)", fontWeight: 700, letterSpacing: "0.05em" }}>
          CREATE PASSWORD
        </label>
        <div style={{ position: "relative", width: "100%" }}>
          <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--accent-muted)", display: "flex", alignItems: "center" }}>
            <Lock size={16} />
          </span>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Min 8 characters"
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
        {loading ? "Activating account..." : "ACTIVATE MY ACCOUNT"}
      </button>
    </form>
  );
}
