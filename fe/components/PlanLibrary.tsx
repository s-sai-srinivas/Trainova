"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, ClipboardList, X, Copy } from "lucide-react";
import { createNewPlan, duplicatePlan } from "@/app/actions";
import { APP_CONFIG } from "@/lib/config";

interface PlanItem {
  id: string;
  name: string;
  description: string | null;
  workoutDaysCount: number;
}

interface PlanLibraryProps {
  initialPlans: PlanItem[];
}

export default function PlanLibrary({ initialPlans }: PlanLibraryProps) {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanItem[]>(initialPlans);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    const res = await createNewPlan(name, description);
    if (res.success && res.planId) {
      const newPlan: PlanItem = {
        id: res.planId,
        name,
        description: description || null,
        workoutDaysCount: 3, // Auto-seeded with 3 days
      };
      setPlans((prev) => [...prev, newPlan]);
      setShowModal(false);
      setName("");
      setDescription("");
    } else {
      setError(res.error || "Failed to create plan");
    }
    setLoading(false);
  };

  return (
    <div className="flex-col gap-md">
      {/* Header with trigger */}
      <div className="flex-row items-center justify-between">
        <span style={{ fontSize: "14px", color: "var(--accent-muted)" }}>
          {plans.length} templates available
        </span>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex-row items-center gap-sm"
          style={{ padding: "8px 16px", fontSize: "14px" }}
        >
          <Plus size={16} />
          Create New Plan
        </button>
      </div>

      {/* Grid List */}
      <div 
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "12px"
        }}
      >
        {plans.map((plan) => (
          <Link
            key={plan.id}
            href={`/trainer/plans/${plan.id}`}
            className="glass-card flex-row items-center gap-md clickable"
            style={{ textDecoration: "none", color: "inherit", padding: "20px" }}
          >
            <div 
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: "var(--border-frosted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-white)"
              }}
            >
              <ClipboardList size={24} />
            </div>
            <div className="flex-col" style={{ flex: 1, gap: "4px" }}>
              <span className="text-heading" style={{ fontSize: "18px" }}>{plan.name}</span>
              <span style={{ fontSize: "13px", color: "var(--accent-muted)" }}>
                {plan.description || "No description provided."}
              </span>
              <span style={{ fontSize: "12px", color: "var(--accent-muted)", marginTop: "4px", fontWeight: 600 }}>
                {plan.workoutDaysCount} Workout Days
              </span>
            </div>
            <div className="flex-row items-center" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (confirm(`Duplicate plan template "${plan.name}"?`)) {
                    const res = await duplicatePlan(plan.id);
                    if (res.success && res.planId) {
                      router.refresh();
                    } else {
                      alert("Failed to duplicate plan template.");
                    }
                  }
                }}
                title="Duplicate Plan"
                className="touch-action"
                style={{
                  background: "var(--bg-surface-glass)",
                  border: "1px solid var(--border-frosted)",
                  borderRadius: "8px",
                  color: "var(--accent-white)",
                  width: "44px",
                  height: "44px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer"
                }}
              >
                <Copy size={16} />
              </button>
            </div>
          </Link>
        ))}
      </div>

      {/* Create Modal Dialog */}
      {showModal && (
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
          onClick={() => setShowModal(false)}
        >
          <div
            className="glass-card flex-col gap-md"
            style={{
              width: "100%",
              maxWidth: "400px",
              padding: "24px",
              backgroundColor: "var(--bg-primary)",
              border: "1px solid var(--accent-white)",
              animation: "fadeIn 0.2s ease-out"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-row justify-between items-center" style={{ borderBottom: "1px solid var(--border-frosted)", paddingBottom: "12px" }}>
              <span className="text-heading" style={{ fontSize: "18px" }}>Create Plan Template</span>
              <button
                onClick={() => setShowModal(false)}
                className="touch-action"
                style={{ background: "none", border: "none", color: "var(--accent-white)" }}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <span style={{ fontSize: "13px", color: "var(--status-red)", fontWeight: 600 }}>{error}</span>
            )}

            <form onSubmit={handleSubmit} className="flex-col gap-md">
              <div className="flex-col gap-sm">
                <label style={{ fontSize: "12px", color: "var(--accent-muted)", fontWeight: 600 }}>PLAN NAME</label>
                <input
                  type="text"
                  placeholder="e.g., Strength Core 3-Day"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="flex-col gap-sm">
                <label style={{ fontSize: "12px", color: "var(--accent-muted)", fontWeight: 600 }}>DESCRIPTION</label>
                <input
                  type="text"
                  placeholder="e.g., Focus on heavy compound lifting"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="btn-primary w-full mt-md"
                style={{ padding: "12px" }}
              >
                {loading ? "Creating Template..." : "Confirm & Create"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
