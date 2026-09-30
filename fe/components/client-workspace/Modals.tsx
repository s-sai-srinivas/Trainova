"use client";

import { X, Video } from "lucide-react";
import { APP_CONFIG } from "@/lib/config";
import { duplicateExercise, archiveExercise, updateExerciseNotes } from "@/app/actions";
import { ExerciseLibraryItem } from "@/lib/types";

interface ModalsProps {
  clientName: string;
  // Template Modal
  showTemplateModal: boolean;
  setShowTemplateModal: (show: boolean) => void;
  selectedTemplateId: string;
  setSelectedTemplateId: (id: string) => void;
  masterPlanTemplates: { id: string; name: string }[];
  assigning: boolean;
  assignError: string | null;
  handleAssignTemplate: () => void;

  // Message Modal
  showMessageModal: boolean;
  setShowMessageModal: (show: boolean) => void;
  clientMessageText: string;
  setClientMessageText: (text: string) => void;
  messageSentStatus: boolean;
  handleSendMessage: () => void;

  // Exercise Side Panel Drawer
  sidePanelExId: string | null;
  setSidePanelExId: (id: string | null) => void;
  sidePanelEx: ExerciseLibraryItem | null | undefined;
  uploadingVideo: boolean;
  handleVideoUpload: (e: React.ChangeEvent<HTMLInputElement>, exerciseId: string, type: "main" | "side" | "mistakes") => void;
  setLocalLibExercises: React.Dispatch<React.SetStateAction<ExerciseLibraryItem[]>>;
}

export default function Modals({
  clientName,
  showTemplateModal,
  setShowTemplateModal,
  selectedTemplateId,
  setSelectedTemplateId,
  masterPlanTemplates,
  assigning,
  assignError,
  handleAssignTemplate,
  showMessageModal,
  setShowMessageModal,
  clientMessageText,
  setClientMessageText,
  messageSentStatus,
  handleSendMessage,
  sidePanelExId,
  setSidePanelExId,
  sidePanelEx,
  uploadingVideo,
  handleVideoUpload,
  setLocalLibExercises
}: ModalsProps) {
  return (
    <>
      {/* MODAL 1: TEMPLATE ASSIGNER MODAL */}
      {showTemplateModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: `rgba(0, 0, 0, ${APP_CONFIG.MODAL_BACKDROP_OPACITY})`, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-card flex-col gap-md" style={{ width: "90%", maxWidth: "380px", padding: "20px" }}>
            <div className="flex-row justify-between items-center" style={{ borderBottom: "1px solid var(--border-frosted)", paddingBottom: "10px" }}>
              <strong style={{ fontSize: "15px" }}>Assign Program Template</strong>
              <button onClick={() => setShowTemplateModal(false)} style={{ background: "none", border: "none", color: "var(--accent-white)", cursor: "pointer" }}><X size={18} /></button>
            </div>
            
            <span style={{ fontSize: "12px", color: "var(--accent-muted)" }}>Select a master training template to clone onto {clientName}. The client gets an isolated copy — editing it will not change the master.</span>
            
            <select 
              value={selectedTemplateId} 
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              style={{ width: "100%", height: "38px", fontSize: "13px" }}
            >
              <option value="">-- Select Template --</option>
              {masterPlanTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>

            {assignError && <div style={{ color: "var(--status-red)", fontSize: "12px" }}>{assignError}</div>}

            <button 
              onClick={handleAssignTemplate} 
              disabled={assigning || !selectedTemplateId} 
              className="btn-primary w-full"
              style={{ minHeight: "40px", fontSize: "13px" }}
            >
              {assigning ? "Assigning Plan..." : "Assign & Clone To Client"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: MESSAGE CLIENT OVERLAY MODAL */}
      {showMessageModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: `rgba(0, 0, 0, ${APP_CONFIG.MODAL_BACKDROP_OPACITY})`, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-card flex-col gap-md" style={{ width: "90%", maxWidth: "380px", padding: "20px" }}>
            <div className="flex-row justify-between items-center" style={{ borderBottom: "1px solid var(--border-frosted)", paddingBottom: "10px" }}>
              <strong style={{ fontSize: "15px" }}>Message {clientName}</strong>
              <button onClick={() => setShowMessageModal(false)} style={{ background: "none", border: "none", color: "var(--accent-white)", cursor: "pointer" }}><X size={18} /></button>
            </div>

            <textarea
              rows={4}
              placeholder={`Send message details or feedback note to ${clientName}...`}
              value={clientMessageText}
              onChange={(e) => setClientMessageText(e.target.value)}
              style={{
                width: "100%",
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-frosted)",
                color: "var(--accent-white)",
                padding: "10px",
                borderRadius: "8px",
                fontSize: "13px",
                resize: "none"
              }}
            />

            <button
              onClick={handleSendMessage}
              disabled={!clientMessageText.trim()}
              className="btn-primary w-full"
              style={{ minHeight: "40px", fontSize: "13px" }}
            >
              Open in WhatsApp
            </button>
          </div>
        </div>
      )}



      {/* SIDE PANEL: EXERCISE LIBRARY DETAILS SLIDE-OUT PANEL */}
      {sidePanelExId && sidePanelEx && (
        <div 
          style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: `rgba(0, 0, 0, ${APP_CONFIG.MODAL_BACKDROP_OPACITY})`, zIndex: 200, display: "flex", justifyContent: "flex-end" }}
          onClick={() => setSidePanelExId(null)}
        >
          <div 
            className="flex-col gap-md"
            style={{ 
              width: "100%", 
              maxWidth: "380px", 
              backgroundColor: "var(--bg-primary)", 
              borderLeft: "1px solid var(--border-frosted)", 
              padding: "24px", 
              height: "100vh", 
              animation: "slideInRight 0.25s ease-out", 
              color: "var(--accent-white)",
              overflowY: "auto"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-row justify-between items-center" style={{ borderBottom: "1px solid var(--border-frosted)", paddingBottom: "12px" }}>
              <span className="text-heading" style={{ fontSize: "16px", fontWeight: 700 }}>{sidePanelEx.name}</span>
              <button onClick={() => setSidePanelExId(null)} style={{ background: "none", border: "none", color: "var(--accent-white)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <div className="flex-col gap-sm" style={{ fontSize: "13px" }}>
              <div className="flex-row justify-between">
                <span style={{ color: "var(--accent-muted)" }}>Muscle Target:</span>
                <strong>{sidePanelEx.muscleGroup}</strong>
              </div>
              <div className="flex-row justify-between">
                <span style={{ color: "var(--accent-muted)" }}>Equipment:</span>
                <strong>{sidePanelEx.equipmentType}</strong>
              </div>
              <div className="flex-col gap-xs mt-xs">
                <span style={{ color: "var(--accent-muted)" }}>Coaching Notes:</span>
                <p style={{ margin: 0, fontStyle: "italic", fontSize: "12.5px" }}>
                  {sidePanelEx.coachingCue || "No custom coaching cues configured."}
                </p>
              </div>
              {sidePanelEx.tags && (
                <div className="flex-col gap-xs mt-xs">
                  <span style={{ color: "var(--accent-muted)" }}>Tags:</span>
                  <div className="flex-row" style={{ flexWrap: "wrap", gap: "4px" }}>
                    {sidePanelEx.tags.split(",").map((tag: string, i: number) => (
                      <span key={i} style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid var(--border-frosted)", color: "var(--accent-muted)" }}>
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-col gap-md" style={{ borderTop: "1px solid var(--border-frosted)", paddingTop: "16px", marginTop: "12px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-muted)", textTransform: "uppercase" }}>
                Video Demonstration Clips
              </span>

              {uploadingVideo && <div style={{ fontSize: "12px", color: "var(--status-green)" }}>Uploading video...</div>}

              {/* Main Demo */}
              <div className="flex-col gap-xs">
                <span style={{ fontSize: "11px" }}>Main Demo</span>
                {sidePanelEx.videoMain ? (
                  <video src={sidePanelEx.videoMain} controls playsInline preload="metadata" style={{ width: "100%", height: "90px", borderRadius: "6px", backgroundColor: "#000" }} />
                ) : (
                  <div style={{ height: "60px", border: "1px dashed var(--border-frosted)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "var(--accent-muted)" }}>No Video Demonstration</div>
                )}
                <label className="btn-secondary flex-row items-center justify-center cursor-pointer" style={{ fontSize: "11px", padding: "6px", minHeight: "36px" }}>
                  <Video size={11} /> <span style={{ marginLeft: "4px" }}>Upload Demo Video</span>
                  <input type="file" accept="video/*" onChange={(e) => handleVideoUpload(e, sidePanelEx.id, "main")} style={{ display: "none" }} disabled={uploadingVideo} />
                </label>
              </div>

              {/* Side View */}
              <div className="flex-col gap-xs">
                <span style={{ fontSize: "11px" }}>Side View Angle</span>
                {sidePanelEx.videoSide ? (
                  <video src={sidePanelEx.videoSide} controls playsInline preload="metadata" style={{ width: "100%", height: "90px", borderRadius: "6px", backgroundColor: "#000" }} />
                ) : (
                  <div style={{ height: "60px", border: "1px dashed var(--border-frosted)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "var(--accent-muted)" }}>No Side Demonstration</div>
                )}
                <label className="btn-secondary flex-row items-center justify-center cursor-pointer" style={{ fontSize: "11px", padding: "6px", minHeight: "36px" }}>
                  <Video size={11} /> <span style={{ marginLeft: "4px" }}>Upload Side Video</span>
                  <input type="file" accept="video/*" onChange={(e) => handleVideoUpload(e, sidePanelEx.id, "side")} style={{ display: "none" }} disabled={uploadingVideo} />
                </label>
              </div>

              {/* Mistakes */}
              <div className="flex-col gap-xs">
                <span style={{ fontSize: "11px" }}>Common Mistakes Clip</span>
                {sidePanelEx.videoMistakes ? (
                  <video src={sidePanelEx.videoMistakes} controls playsInline preload="metadata" style={{ width: "100%", height: "90px", borderRadius: "6px", backgroundColor: "#000" }} />
                ) : (
                  <div style={{ height: "60px", border: "1px dashed var(--border-frosted)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "var(--accent-muted)" }}>No Video Mistakes Clip</div>
                )}
                <label className="btn-secondary flex-row items-center justify-center cursor-pointer" style={{ fontSize: "11px", padding: "6px", minHeight: "36px" }}>
                  <Video size={11} /> <span style={{ marginLeft: "4px" }}>Upload Mistakes Video</span>
                  <input type="file" accept="video/*" onChange={(e) => handleVideoUpload(e, sidePanelEx.id, "mistakes")} style={{ display: "none" }} disabled={uploadingVideo} />
                </label>
              </div>

            </div>

            {/* Actions */}
            <div className="flex-col gap-xs" style={{ borderTop: "1px solid var(--border-frosted)", paddingTop: "16px", marginTop: "16px" }}>
              <button 
                onClick={async () => {
                  const input = prompt("Update coaching note details to:", sidePanelEx.coachingCue || "");
                  if (input !== null) {
                    try {
                      const res = await updateExerciseNotes(sidePanelEx.id, input.trim());
                      if (res.success) {
                        setLocalLibExercises(prev => prev.map(ex => ex.id === sidePanelEx.id ? { ...ex, coachingCue: input } : ex));
                        alert("Coaching notes updated successfully.");
                      } else {
                        alert(res.error || "Failed to update notes.");
                      }
                    } catch (err) {
                      console.error("Failed to update notes:", err);
                      alert("Error updating notes.");
                    }
                  }
                }}
                className="btn-secondary w-full"
                style={{ fontSize: "12px", minHeight: "36px" }}
              >
                Edit Details Notes
              </button>
              <button 
                onClick={async () => {
                  try {
                    const result = await duplicateExercise(sidePanelEx.id);
                    if (result.success) {
                      setSidePanelExId(null);
                    } else {
                      alert(result.error || "Failed to duplicate exercise.");
                    }
                  } catch (err) {
                    console.error("Failed to duplicate exercise:", err);
                    alert("Failed to duplicate exercise.");
                  }
                }}
                className="btn-secondary w-full"
                style={{ fontSize: "12px", minHeight: "36px" }}
              >
                Duplicate Exercise Template
              </button>
              <button 
                onClick={async () => {
                  if (confirm("Archive this exercise from library list?")) {
                    try {
                      const res = await archiveExercise(sidePanelEx.id, true);
                      if (res.success) {
                        setLocalLibExercises(prev => prev.filter(ex => ex.id !== sidePanelEx.id));
                        setSidePanelExId(null);
                        alert("Exercise archived successfully.");
                      } else {
                        alert(res.error || "Failed to archive exercise.");
                      }
                    } catch (err) {
                      console.error("Failed to archive exercise:", err);
                      alert("Error archiving exercise.");
                    }
                  }
                }}
                className="btn-secondary w-full"
                style={{ fontSize: "12px", minHeight: "36px", color: "var(--status-red)" }}
              >
                Archive Movement
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
