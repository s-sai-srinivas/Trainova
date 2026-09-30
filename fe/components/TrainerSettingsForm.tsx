"use client";

import { useState } from "react";
import { Save, AlertCircle, LogOut } from "lucide-react";
import { updateTrainerProfile, logout } from "@/app/actions";

interface TrainerSettingsFormProps {
  initialData: {
    name: string;
    businessName: string;
    instagramHandle: string;
    coachingType: string;
  };
}

export default function TrainerSettingsForm({ initialData }: TrainerSettingsFormProps) {
  const [businessName, setBusinessName] = useState(initialData.businessName);
  const [instagramHandle, setInstagramHandle] = useState(initialData.instagramHandle);
  const [coachingType, setCoachingType] = useState(initialData.coachingType);
  
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ success?: boolean; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);

    const res = await updateTrainerProfile(
      businessName.trim(),
      instagramHandle.trim(),
      coachingType
    );

    if (res.success) {
      setStatus({ success: true });
      setTimeout(() => setStatus(null), 3000);
    } else {
      setStatus({ success: false, error: res.error || "Failed to save settings." });
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex-col gap-md glass-card" style={{ padding: "24px" }}>
      {status && (
        <div 
          style={{
            backgroundColor: status.success ? "var(--status-green)" : "var(--status-red)",
            color: "black",
            padding: "12px",
            borderRadius: "12px",
            fontWeight: 600,
            textAlign: "center",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px"
          }}
        >
          {status.success ? (
            <span>Settings saved successfully in database!</span>
          ) : (
            <>
              <AlertCircle size={16} />
              <span>Error: {status.error}</span>
            </>
          )}
        </div>
      )}

      <div className="flex-col gap-sm">
        <label style={{ fontSize: "12px", color: "var(--accent-muted)", fontWeight: 600 }}>COACH NAME</label>
        <input
          type="text"
          value={initialData.name}
          disabled
          style={{ cursor: "not-allowed", opacity: 0.6 }}
        />
        <span style={{ fontSize: "11px", color: "var(--accent-muted)" }}>
          Contact support to modify primary registration name.
        </span>
      </div>

      <div className="flex-col gap-sm">
        <label style={{ fontSize: "12px", color: "var(--accent-muted)", fontWeight: 600 }}>BUSINESS NAME</label>
        <input
          type="text"
          placeholder="e.g. Apex Performance Coaching"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
        />
      </div>

      <div className="flex-col gap-sm">
        <label style={{ fontSize: "12px", color: "var(--accent-muted)", fontWeight: 600 }}>INSTAGRAM HANDLE</label>
        <div style={{ position: "relative", width: "100%" }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--accent-muted)", fontWeight: 600 }}>
            @
          </span>
          <input
            type="text"
            placeholder="apex_coach"
            value={instagramHandle}
            onChange={(e) => setInstagramHandle(e.target.value)}
            style={{ paddingLeft: "28px" }}
          />
        </div>
      </div>

      <div className="flex-col gap-sm">
        <label style={{ fontSize: "12px", color: "var(--accent-muted)", fontWeight: 600 }}>COACHING FOCUS SPECIALIZATION</label>
        <select
          value={coachingType}
          onChange={(e) => setCoachingType(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", backgroundColor: "var(--bg-primary)", color: "var(--accent-white)", border: "1px solid var(--border-frosted)" }}
        >
          <option value="Fat Loss">Fat Loss Focus</option>
          <option value="Bodybuilding">Bodybuilding & Hypertrophy</option>
          <option value="Women's Fitness">Women&apos;s Fitness Specialist</option>
          <option value="Powerlifting">Powerlifting & Strength</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="btn-primary flex-row items-center justify-center gap-sm mt-md"
        style={{ padding: "12px" }}
      >
        <Save size={18} />
        {saving ? "Saving Changes..." : "Save Brand Settings"}
      </button>

      <div style={{ borderTop: "1px solid var(--border-frosted)", paddingTop: "20px", marginTop: "10px" }}>
        <button
          type="button"
          onClick={async () => {
            if (confirm("Are you sure you want to sign out?")) {
              const res = await logout();
              if (res.success) {
                window.location.href = "/login";
              }
            }
          }}
          className="btn-secondary flex-row items-center justify-center gap-sm w-full"
          style={{ padding: "12px", color: "var(--status-red)", borderColor: "var(--status-red)" }}
        >
          <LogOut size={16} />
          Sign Out of Account
        </button>
      </div>
    </form>
  );
}
