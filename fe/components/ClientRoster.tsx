"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, SlidersHorizontal, X, ArrowUpRight, Plus, Trash2 } from "lucide-react";
import { createClientProfile, deleteClientProfile } from "@/app/actions";
import { APP_CONFIG } from "@/lib/config";

interface ClientData {
  id: string;
  name: string;
  phone: string;
  goal: string;
  compliance: number;
  lastLogDate: string;
  alertType: "RED" | "YELLOW" | "GREEN";
}

interface ClientRosterProps {
  initialClients: ClientData[];
}

export default function ClientRoster({ initialClients }: ClientRosterProps) {
  const router = useRouter();
  const clients = initialClients;
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  
  // Onboard client state
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardName, setOnboardName] = useState("");
  const [onboardPhone, setOnboardPhone] = useState("");
  const [onboardGoal, setOnboardGoal] = useState<"FAT_LOSS" | "MUSCLE_GAIN" | "STRENGTH" | "MAINTENANCE">("FAT_LOSS");
  const [onboardCalories, setOnboardCalories] = useState<number>(APP_CONFIG.DEFAULT_CALORIE_TARGET);
  const [onboardSteps, setOnboardSteps] = useState<number>(APP_CONFIG.DEFAULT_STEP_TARGET);
  const [onboardWeightTarget, setOnboardWeightTarget] = useState("");
  const [onboardCurrentWeight, setOnboardCurrentWeight] = useState("");
  const [onboardAge, setOnboardAge] = useState("");
  const [onboardHeight, setOnboardHeight] = useState("");
  const [onboardInjuries, setOnboardInjuries] = useState("");
  const [onboardGymAccess, setOnboardGymAccess] = useState("Commercial Gym");
  const [onboardEmail, setOnboardEmail] = useState("");
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Link generation display
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardName.trim() || !onboardPhone.trim()) return;

    setOnboardLoading(true);
    setOnboardError(null);

    const res = await createClientProfile(
      onboardName,
      onboardPhone,
      onboardGoal,
      onboardCalories,
      onboardSteps,
      onboardWeightTarget ? parseFloat(onboardWeightTarget) : undefined,
      onboardAge ? parseInt(onboardAge) : undefined,
      onboardHeight ? parseFloat(onboardHeight) : undefined,
      onboardInjuries.trim() || undefined,
      onboardGymAccess,
      onboardEmail.trim() || undefined,
      onboardCurrentWeight ? parseFloat(onboardCurrentWeight) : undefined
    );

    if (res.success && res.inviteLink) {
      const first = onboardName.trim().split(" ")[0];
      const phone = onboardPhone.replace(/[^\d]/g, "");
      const text = `Hey ${first}, welcome to Trainova. Tap this link to set up your account: ${res.inviteLink}`;
      setInviteName(onboardName.trim());
      setInvitePhone(phone);
      setGeneratedInviteLink(res.inviteLink);
      window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`, "_blank");
      setOnboardName("");
      setOnboardPhone("");
      setOnboardGoal("FAT_LOSS");
      setOnboardCalories(APP_CONFIG.DEFAULT_CALORIE_TARGET);
      setOnboardSteps(APP_CONFIG.DEFAULT_STEP_TARGET);
      setOnboardWeightTarget("");
      setOnboardCurrentWeight("");
      setOnboardAge("");
      setOnboardHeight("");
      setOnboardInjuries("");
      setOnboardGymAccess("Commercial Gym");
      setOnboardEmail("");
      router.refresh();
    } else {
      setOnboardError(res.error || "Failed to onboard client");
    }
    setOnboardLoading(false);
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (!confirm(`Delete ${clientName}? This permanently removes their account, logs, and check-ins.`)) {
      return;
    }
    setDeletingId(clientId);
    const res = await deleteClientProfile(clientId);
    setDeletingId(null);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Failed to delete client.");
    }
  };

  // Filters state
  const [selectedGoal, setSelectedGoal] = useState<string>("ALL");
  const [selectedAlert, setSelectedAlert] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"name" | "compliance">("name");

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const clearFilters = () => {
    setSelectedGoal("ALL");
    setSelectedAlert("ALL");
    setSortBy("name");
  };

  // Filter & sort clients locally
  const filteredClients = clients
    .filter((client) => {
      const matchesSearch = 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        client.phone.includes(searchTerm);
      
      const matchesGoal = selectedGoal === "ALL" || client.goal === selectedGoal;
      const matchesAlert = selectedAlert === "ALL" || client.alertType === selectedAlert;

      return matchesSearch && matchesGoal && matchesAlert;
    })
    .sort((a, b) => {
      if (sortBy === "compliance") {
        return b.compliance - a.compliance;
      }
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="flex-col gap-md">
      {/* Onboard Client Row */}
      <div className="flex-row items-center justify-between" style={{ width: "100%" }}>
        <span style={{ fontSize: "14px", color: "var(--accent-muted)" }}>
          Onboard new clients to track targets
        </span>
        <button
          onClick={() => setShowOnboardModal(true)}
          className="btn-primary flex-row items-center gap-sm"
          style={{ padding: "8px 16px", fontSize: "13px" }}
        >
          <Plus size={16} />
          Onboard Client
        </button>
      </div>

      {/* Search and Filter trigger row */}
      <div className="flex-row items-center gap-sm" style={{ width: "100%" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--accent-muted)", display: "flex", alignItems: "center" }}>
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={handleSearch}
            style={{ paddingLeft: "38px" }}
          />
        </div>
        <button
          onClick={() => setShowFilterDrawer(true)}
          className="btn-secondary touch-action"
          style={{ padding: "0", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <SlidersHorizontal size={20} />
        </button>
      </div>

      {/* Filter Chips Display */}
      {(selectedGoal !== "ALL" || selectedAlert !== "ALL" || sortBy !== "name") && (
        <div className="flex-row gap-sm" style={{ flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "12px", color: "var(--accent-muted)" }}>Active:</span>
          {selectedGoal !== "ALL" && (
            <span style={{ fontSize: "12px", backgroundColor: "var(--border-frosted)", padding: "4px 8px", borderRadius: "12px" }}>
              Goal: {selectedGoal}
            </span>
          )}
          {selectedAlert !== "ALL" && (
            <span style={{ fontSize: "12px", backgroundColor: "var(--border-frosted)", padding: "4px 8px", borderRadius: "12px" }}>
              Alert: {selectedAlert}
            </span>
          )}
          {sortBy !== "name" && (
            <span style={{ fontSize: "12px", backgroundColor: "var(--border-frosted)", padding: "4px 8px", borderRadius: "12px" }}>
              Sort: Compliance
            </span>
          )}
          <button 
            onClick={clearFilters}
            style={{ fontSize: "12px", background: "none", border: "none", color: "var(--accent-muted)", cursor: "pointer", textDecoration: "underline" }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Roster list */}
      <div className="flex-col gap-sm">
        <span style={{ fontSize: "14px", color: "var(--accent-muted)", marginBottom: "4px" }}>
          Showing {filteredClients.length} of {clients.length} clients
        </span>

        {filteredClients.map((client) => {
          const indicatorClass = 
            client.alertType === "RED" ? "red" : 
            client.alertType === "YELLOW" ? "yellow" : "green";

          return (
            <div 
              key={client.id}
              className="glass-card flex-col gap-sm"
              style={{ padding: "16px" }}
            >
              <Link 
                href={`/trainer/clients/${client.id}`} 
                className="flex-row items-center justify-between clickable"
                style={{ textDecoration: "none", color: "inherit", width: "100%" }}
              >
                <div className="flex-col gap-sm" style={{ flex: 1 }}>
                  <div className="flex-row items-center gap-sm">
                    <span className={`status-pill ${indicatorClass}`} />
                    <span className="text-heading" style={{ fontSize: "18px" }}>{client.name}</span>
                  </div>
                  <div className="flex-row gap-sm" style={{ flexWrap: "wrap", fontSize: "13px", color: "var(--accent-muted)" }}>
                    <span>Goal: {client.goal.replace("_", " ")}</span>
                    <span>|</span>
                    <span>Compliance: {client.compliance}%</span>
                  </div>
                </div>
                <div className="touch-action" style={{ color: "var(--accent-muted)" }}>
                  <ArrowUpRight size={20} />
                </div>
              </Link>
              
              <div 
                className="flex-row justify-between items-center mt-xs" 
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "8px" }}
              >
                <span style={{ fontSize: "12px", color: "var(--accent-muted)" }}>Last Log: {client.lastLogDate}</span>
                <div className="flex-row gap-sm items-center">
                  <button
                    type="button"
                    onClick={() => handleDeleteClient(client.id, client.name)}
                    disabled={deletingId === client.id}
                    className="btn-secondary"
                    style={{
                      fontSize: "12px",
                      padding: "4px 10px",
                      borderRadius: "8px",
                      color: "var(--status-red)",
                      borderColor: "var(--status-red)",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    title="Delete client"
                  >
                    <Trash2 size={12} />
                    {deletingId === client.id ? "…" : "Delete"}
                  </button>
                  <Link
                    href={`/trainer/clients/${client.id}/plan`}
                    className="btn-secondary"
                    style={{ fontSize: "12px", padding: "4px 12px", borderRadius: "8px", textDecoration: "none", color: "var(--accent-white)" }}
                  >
                    Plan Workout
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom sliding filter drawer */}
      {showFilterDrawer && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: `rgba(0, 0, 0, ${APP_CONFIG.MODAL_BACKDROP_OPACITY})`,
            zIndex: 200,
            display: "flex",
            alignItems: "flex-end"
          }}
          onClick={() => setShowFilterDrawer(false)}
        >
          <div 
            className="flex-col gap-md"
            style={{
              width: "100%",
              maxWidth: "430px",
              margin: "0 auto",
              backgroundColor: "var(--bg-primary)",
              borderTop: "1px solid var(--border-frosted)",
              borderTopLeftRadius: "20px",
              borderTopRightRadius: "20px",
              padding: "24px",
              animation: "slideUp 0.3s ease-out",
              color: "var(--accent-white)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-row justify-between items-center" style={{ borderBottom: "1px solid var(--border-frosted)", paddingBottom: "12px" }}>
              <span className="text-heading" style={{ fontSize: "18px" }}>Filter & Sort Clients</span>
              <button 
                onClick={() => setShowFilterDrawer(false)}
                className="touch-action"
                style={{ background: "none", border: "none", color: "var(--accent-white)" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Filter by Goal */}
            <div className="flex-col gap-sm">
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--accent-muted)" }}>GOAL</span>
              <div className="flex-row gap-sm" style={{ flexWrap: "wrap" }}>
                {["ALL", "FAT_LOSS", "MUSCLE_GAIN", "STRENGTH", "MAINTENANCE"].map((goal) => (
                  <button
                    key={goal}
                    onClick={() => setSelectedGoal(goal)}
                    style={{
                      padding: "8px 12px",
                      fontSize: "12px",
                      borderRadius: "12px",
                      border: "1px solid var(--border-frosted)",
                      backgroundColor: selectedGoal === goal ? "var(--accent-white)" : "transparent",
                      color: selectedGoal === goal ? "var(--bg-primary)" : "var(--accent-white)",
                      cursor: "pointer",
                      fontWeight: selectedGoal === goal ? 600 : 400
                    }}
                  >
                    {goal.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter by Alert Status */}
            <div className="flex-col gap-sm">
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--accent-muted)" }}>ALERT STATUS</span>
              <div className="flex-row gap-sm">
                {["ALL", "RED", "YELLOW", "GREEN"].map((alert) => (
                  <button
                    key={alert}
                    onClick={() => setSelectedAlert(alert)}
                    style={{
                      padding: "8px 12px",
                      fontSize: "12px",
                      borderRadius: "12px",
                      border: "1px solid var(--border-frosted)",
                      backgroundColor: selectedAlert === alert ? "var(--accent-white)" : "transparent",
                      color: selectedAlert === alert ? "var(--bg-primary)" : "var(--accent-white)",
                      cursor: "pointer",
                      fontWeight: selectedAlert === alert ? 600 : 400
                    }}
                  >
                    {alert}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort options */}
            <div className="flex-col gap-sm" style={{ borderTop: "1px solid var(--border-frosted)", paddingTop: "16px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--accent-muted)" }}>SORT BY</span>
              <div className="flex-row gap-sm">
                <button
                  onClick={() => setSortBy("name")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid var(--border-frosted)",
                    backgroundColor: sortBy === "name" ? "var(--accent-white)" : "transparent",
                    color: sortBy === "name" ? "var(--bg-primary)" : "var(--accent-white)",
                    cursor: "pointer",
                    fontWeight: sortBy === "name" ? 600 : 400
                  }}
                >
                  Name (A-Z)
                </button>
                <button
                  onClick={() => setSortBy("compliance")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid var(--border-frosted)",
                    backgroundColor: sortBy === "compliance" ? "var(--accent-white)" : "transparent",
                    color: sortBy === "compliance" ? "var(--bg-primary)" : "var(--accent-white)",
                    cursor: "pointer",
                    fontWeight: sortBy === "compliance" ? 600 : 400
                  }}
                >
                  Compliance (%)
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowFilterDrawer(false)}
              className="btn-primary w-full mt-md"
              style={{ padding: "12px" }}
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Onboard Client Modal */}
      {showOnboardModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: `rgba(0, 0, 0, ${APP_CONFIG.MODAL_BACKDROP_OPACITY})`,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
          onClick={() => setShowOnboardModal(false)}
        >
          <div
            className="glass-card flex-col gap-md"
            style={{
              width: "100%",
              maxWidth: "400px",
              padding: "24px",
              backgroundColor: "var(--bg-primary)",
              border: "1px solid var(--accent-white)",
              animation: "fadeIn 0.2s ease-out",
              maxHeight: "90vh",
              overflowY: "auto"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-row justify-between items-center" style={{ borderBottom: "1px solid var(--border-frosted)", paddingBottom: "12px" }}>
              <span className="text-heading" style={{ fontSize: "18px" }}>Onboard New Client</span>
              <button
                onClick={() => setShowOnboardModal(false)}
                className="touch-action"
                style={{ background: "none", border: "none", color: "var(--accent-white)" }}
              >
                <X size={20} />
              </button>
            </div>

            {onboardError && (
              <span style={{ fontSize: "13px", color: "var(--status-red)", fontWeight: 600 }}>{onboardError}</span>
            )}

            {generatedInviteLink ? (
              <div className="flex-col gap-md text-center" style={{ padding: "12px 0" }}>
                <span style={{ fontSize: "36px" }}>🎉</span>
                <span className="text-heading" style={{ fontSize: "20px" }}>Client Onboarded!</span>
                <p style={{ fontSize: "14px", color: "var(--accent-muted)", lineHeight: "1.4" }}>
                  WhatsApp should be open with {inviteName || "their"} invite. If not, tap below.
                </p>
                
                <div 
                  className="glass-card" 
                  style={{ 
                    padding: "12px", 
                    backgroundColor: "var(--bg-primary)", 
                    border: "1px solid var(--border-frosted)",
                    fontSize: "12px",
                    wordBreak: "break-all",
                    fontFamily: "monospace",
                    userSelect: "all",
                    margin: "12px 0"
                  }}
                >
                  {generatedInviteLink}
                </div>

                <div className="flex-col gap-sm">
                  <a
                    href={`https://api.whatsapp.com/send?phone=${invitePhone}&text=${encodeURIComponent(
                      `Hey ${inviteName.split(" ")[0] || ""}, welcome to Trainova. Tap this link to set up your account: ${generatedInviteLink}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary flex-row items-center justify-center gap-sm"
                    style={{ padding: "12px", textDecoration: "none", height: 48 }}
                  >
                    Send invite on WhatsApp
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedInviteLink);
                    }}
                    className="btn-secondary"
                    style={{ padding: "12px" }}
                  >
                    Copy invite link
                  </button>

                  <button
                    onClick={() => {
                      setGeneratedInviteLink(null);
                      setShowOnboardModal(false);
                      router.refresh();
                    }}
                    className="btn-secondary"
                    style={{ padding: "12px", marginTop: "8px" }}
                  >
                    Close & Refresh
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleOnboardSubmit} className="flex-col gap-md">
                <div className="flex-col gap-sm">
                  <label style={{ fontSize: "12px", color: "var(--accent-muted)", fontWeight: 600 }}>CLIENT NAME</label>
                  <input
                    type="text"
                    placeholder="e.g., Amit Patel"
                    value={onboardName}
                    onChange={(e) => setOnboardName(e.target.value)}
                    required
                  />
                </div>

                <div className="flex-row gap-sm">
                  <div className="flex-col gap-sm" style={{ flex: 1 }}>
                    <label style={{ fontSize: "12px", color: "var(--accent-muted)", fontWeight: 600 }}>PHONE (UNIQUE)</label>
                    <input
                      type="text"
                      placeholder="e.g., +919999111222"
                      value={onboardPhone}
                      onChange={(e) => setOnboardPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex-col gap-sm" style={{ flex: 1 }}>
                    <label style={{ fontSize: "12px", color: "var(--accent-muted)", fontWeight: 600 }}>EMAIL (OPTIONAL)</label>
                    <input
                      type="email"
                      placeholder="e.g., amit@gmail.com"
                      value={onboardEmail}
                      onChange={(e) => setOnboardEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex-row gap-sm">
                  <div className="flex-col gap-sm" style={{ flex: 1 }}>
                    <label style={{ fontSize: "12px", color: "var(--accent-muted)", fontWeight: 600 }}>GOAL</label>
                    <select
                      value={onboardGoal}
                      onChange={(e) => setOnboardGoal(e.target.value as "FAT_LOSS" | "MUSCLE_GAIN" | "STRENGTH" | "MAINTENANCE")}
                      style={{ width: "100%", padding: "8px 12px", backgroundColor: "var(--bg-primary)", color: "var(--accent-white)", border: "1px solid var(--border-frosted)" }}
                    >
                      <option value="FAT_LOSS">FAT LOSS</option>
                      <option value="MUSCLE_GAIN">MUSCLE GAIN</option>
                      <option value="STRENGTH">STRENGTH</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                    </select>
                  </div>
                  <div className="flex-col gap-sm" style={{ flex: 1 }}>
                    <label style={{ fontSize: "12px", color: "var(--accent-muted)", fontWeight: 600 }}>GYM ACCESS</label>
                    <select
                      value={onboardGymAccess}
                      onChange={(e) => setOnboardGymAccess(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", backgroundColor: "var(--bg-primary)", color: "var(--accent-white)", border: "1px solid var(--border-frosted)" }}
                    >
                      <option value="Commercial Gym">Commercial Gym</option>
                      <option value="Home Gym">Home Gym</option>
                      <option value="No Equipment">No Equipment</option>
                    </select>
                  </div>
                </div>

                <div className="flex-row gap-sm">
                  <div className="flex-col gap-sm" style={{ flex: 1 }}>
                    <label style={{ fontSize: "10px", color: "var(--accent-muted)", fontWeight: 600 }}>CALORIES TARGET</label>
                    <input
                      type="number"
                      value={onboardCalories}
                      onChange={(e) => setOnboardCalories(parseInt(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div className="flex-col gap-sm" style={{ flex: 1 }}>
                    <label style={{ fontSize: "10px", color: "var(--accent-muted)", fontWeight: 600 }}>STEPS TARGET</label>
                    <input
                      type="number"
                      value={onboardSteps}
                      onChange={(e) => setOnboardSteps(parseInt(e.target.value) || 0)}
                      required
                    />
                  </div>
                </div>

                <div className="flex-row gap-sm">
                  <div className="flex-col gap-sm" style={{ flex: 1 }}>
                    <label style={{ fontSize: "10px", color: "var(--accent-muted)", fontWeight: 600 }}>AGE</label>
                    <input
                      type="number"
                      placeholder="e.g., 28"
                      value={onboardAge}
                      onChange={(e) => setOnboardAge(e.target.value)}
                    />
                  </div>
                  <div className="flex-col gap-sm" style={{ flex: 1 }}>
                    <label style={{ fontSize: "10px", color: "var(--accent-muted)", fontWeight: 600 }}>HEIGHT (CM)</label>
                    <input
                      type="number"
                      placeholder="e.g., 175"
                      value={onboardHeight}
                      onChange={(e) => setOnboardHeight(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex-row gap-sm">
                  <div className="flex-col gap-sm" style={{ flex: 1 }}>
                    <label style={{ fontSize: "10px", color: "var(--accent-muted)", fontWeight: 600 }}>CURRENT WEIGHT</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 84.5"
                      value={onboardCurrentWeight}
                      onChange={(e) => setOnboardCurrentWeight(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex-col gap-sm" style={{ flex: 1 }}>
                    <label style={{ fontSize: "10px", color: "var(--accent-muted)", fontWeight: 600 }}>TARGET WEIGHT</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 75.0"
                      value={onboardWeightTarget}
                      onChange={(e) => setOnboardWeightTarget(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex-col gap-sm">
                  <label style={{ fontSize: "12px", color: "var(--accent-muted)", fontWeight: 600 }}>INJURIES / MEDICAL NOTES (OPTIONAL)</label>
                  <input
                    type="text"
                    placeholder="e.g., Lower back disc bulge L4/L5, no heavy squats"
                    value={onboardInjuries}
                    onChange={(e) => setOnboardInjuries(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={onboardLoading || !onboardName.trim() || !onboardPhone.trim()}
                  className="btn-primary w-full mt-md"
                  style={{ padding: "12px" }}
                >
                  {onboardLoading ? "Onboarding Client..." : "Confirm & Onboard"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
