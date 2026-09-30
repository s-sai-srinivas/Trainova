"use client";

import { useState, useEffect } from "react";
import { saveMealLog } from "@/app/actions";
import { Camera, Plus, Check, Clock, Utensils, MessageSquare, AlertCircle, Trash2 } from "lucide-react";

interface MealLog {
  id: string;
  name: string;
  imageUrl: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  loggedAt: string;
  trainerFeedback: string | null;
  feedbackAt: string | null;
}

interface MealsWorkspaceProps {
  client: {
    id: string;
    name: string;
    calorieTarget: number;
    proteinTarget: number;
    carbsTarget: number;
    fatsTarget: number;
  };
  initialMealLogs: MealLog[];
}

export default function MealsWorkspace({ client, initialMealLogs }: MealsWorkspaceProps) {
  const [mealLogs, setMealLogs] = useState<MealLog[]>(initialMealLogs);
  const [showLogDrawer, setShowLogDrawer] = useState(false);

  // New meal form state
  const [mealName, setMealName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [loggingMeal, setLoggingMeal] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state if initialMealLogs prop changes (render-phase state sync)
  const [prevMealLogs, setPrevMealLogs] = useState<MealLog[]>(initialMealLogs);
  if (initialMealLogs !== prevMealLogs) {
    setPrevMealLogs(initialMealLogs);
    setMealLogs(initialMealLogs);
  }

  // Image Compression Handler: Scales image down to max 600px and converts to low-quality JPEG
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 600;
          const MAX_HEIGHT = 600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Highly compress to JPEG with 0.4 quality (about 15KB - 30KB)
            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.4);
            resolve(compressedBase64);
          } else {
            reject(new Error("Failed to get canvas context"));
          }
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealName.trim() || loggingMeal) return;

    setLoggingMeal(true);
    let imageBase64: string | null = null;

    try {
      if (imageFile) {
        imageBase64 = await compressImage(imageFile);
      }

      const res = await saveMealLog(
        mealName.trim(),
        imageBase64,
        parseInt(calories) || 0,
        parseInt(protein) || 0,
        parseInt(carbs) || 0,
        parseInt(fats) || 0
      );

      if (res.success && res.mealLog) {
        setLogSuccess(true);
        const newLog: MealLog = {
          id: res.mealLog.id,
          name: res.mealLog.name,
          imageUrl: res.mealLog.imageUrl,
          calories: res.mealLog.calories,
          protein: res.mealLog.protein,
          carbs: res.mealLog.carbs,
          fats: res.mealLog.fats,
          loggedAt: res.mealLog.loggedAt.toISOString ? res.mealLog.loggedAt.toISOString() : new Date(res.mealLog.loggedAt).toISOString(),
          trainerFeedback: res.mealLog.trainerFeedback,
          feedbackAt: res.mealLog.feedbackAt ? (res.mealLog.feedbackAt.toISOString ? res.mealLog.feedbackAt.toISOString() : new Date(res.mealLog.feedbackAt).toISOString()) : null,
        };

        setMealLogs(prev => [newLog, ...prev]);

        setTimeout(() => {
          setLogSuccess(false);
          setShowLogDrawer(false);
          // Reset form
          setMealName("");
          setImageFile(null);
          setImagePreview(null);
          setCalories("");
          setProtein("");
          setCarbs("");
          setFats("");
        }, 1500);
      } else {
        setErrorMessage(res.error || "Failed to save meal log.");
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setErrorMessage("An error occurred during submission: " + errMsg);
    } finally {
      setLoggingMeal(false);
    }
  };

  // Calculate accumulated macros for today's logs
  const getTodayStart = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  const todayLogs = mealLogs.filter(log => new Date(log.loggedAt).getTime() >= getTodayStart());

  const todayCalories = todayLogs.reduce((acc, curr) => acc + curr.calories, 0);
  const todayProtein = todayLogs.reduce((acc, curr) => acc + curr.protein, 0);
  const todayCarbs = todayLogs.reduce((acc, curr) => acc + curr.carbs, 0);
  const todayFats = todayLogs.reduce((acc, curr) => acc + curr.fats, 0);

  const calPct = Math.round((todayCalories / client.calorieTarget) * 100) || 0;

  const formatLoggedTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }) + " • " + d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex-col gap-md">
      {/* Header section */}
      <section className="glass-card flex-row justify-between items-center" style={{ padding: "16px", marginBottom: "4px" }}>
        <div className="flex-col gap-xs">
          <span style={{ fontSize: "11px", color: "var(--accent-muted)", fontWeight: 700, letterSpacing: "0.05em" }}>ATHLETE PORTAL</span>
          <h1 className="text-heading" style={{ fontSize: "24px", letterSpacing: "-0.5px" }}>Meal Log Feed</h1>
        </div>
        <button
          onClick={() => setShowLogDrawer(true)}
          className="btn-primary flex-row items-center gap-xxs"
          style={{ padding: "8px 16px", fontSize: "13px", boxShadow: "0 4px 12px rgba(255, 255, 255, 0.1)" }}
        >
          <Plus size={16} />
          Log Meal
        </button>
      </section>

      {/* Daily Accumulation Dashboard */}
      <div className="glass-card flex-col gap-md" style={{ padding: "20px" }}>
        <div className="flex-row justify-between items-center">
          <span style={{ fontSize: "11px", color: "var(--accent-muted)", fontWeight: 700, letterSpacing: "0.05em" }}>
            TODAY&apos;S ACCUMULATED CALORIES
          </span>
          <span style={{ fontSize: "12px", color: "var(--status-green)", fontWeight: 700 }}>
            {calPct}% OF BUDGET
          </span>
        </div>

        <div className="flex-row items-end gap-sm">
          <span style={{ fontSize: "36px", fontWeight: 900, lineHeight: 1, letterSpacing: "-1px" }}>
            {todayCalories}
          </span>
          <span style={{ fontSize: "14px", color: "var(--accent-muted)", marginBottom: "4px" }}>
            / {client.calorieTarget} kcal
          </span>
        </div>

        {/* ProgressBar */}
        <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
          <div 
            style={{ 
              height: "100%", 
              background: "linear-gradient(90deg, var(--accent-white), rgba(255,255,255,0.7))",
              width: `${Math.min(100, (todayCalories / client.calorieTarget) * 100)}%`,
              transition: "width 0.4s cubic-bezier(0.1, 0.8, 0.2, 1)",
              boxShadow: "0 0 10px rgba(255, 255, 255, 0.3)"
            }} 
          />
        </div>

        {/* Macros Row */}
        <div className="flex-col gap-sm" style={{ marginTop: "4px" }}>
          {/* Protein */}
          <div className="flex-col gap-xs" style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--border-frosted)" }}>
            <div className="flex-row justify-between items-center">
              <span style={{ fontSize: "12px", color: "var(--accent-muted)", fontWeight: 600 }}>Daily Protein Goal</span>
              <span style={{ fontSize: "11px", color: "var(--accent-muted)", fontWeight: 600 }}>
                {Math.round((todayProtein / client.proteinTarget) * 100) || 0}% Completed
              </span>
            </div>
            <div className="flex-row items-baseline gap-xxs" style={{ margin: "4px 0" }}>
              <span style={{ color: "var(--accent-white)", fontSize: "20px", fontWeight: 800 }}>{todayProtein}g</span>
              <span style={{ fontSize: "12px", color: "var(--accent-muted)" }}>/ {client.proteinTarget}g</span>
            </div>
            <div style={{ height: "6px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
              <div 
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg, #6366f1, #818cf8)",
                  width: `${Math.min(100, (todayProtein / client.proteinTarget) * 100)}%`,
                  transition: "width 0.4s ease-out"
                }}
              />
            </div>
          </div>

          {/* Carbs */}
          <div className="flex-col gap-xs" style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--border-frosted)" }}>
            <div className="flex-row justify-between items-center">
              <span style={{ fontSize: "12px", color: "var(--accent-muted)", fontWeight: 600 }}>Daily Carbohydrates Goal</span>
              <span style={{ fontSize: "11px", color: "var(--accent-muted)", fontWeight: 600 }}>
                {Math.round((todayCarbs / client.carbsTarget) * 100) || 0}% Completed
              </span>
            </div>
            <div className="flex-row items-baseline gap-xxs" style={{ margin: "4px 0" }}>
              <span style={{ color: "var(--accent-white)", fontSize: "20px", fontWeight: 800 }}>{todayCarbs}g</span>
              <span style={{ fontSize: "12px", color: "var(--accent-muted)" }}>/ {client.carbsTarget}g</span>
            </div>
            <div style={{ height: "6px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
              <div 
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg, #fbbf24, #f59e0b)",
                  width: `${Math.min(100, (todayCarbs / client.carbsTarget) * 100)}%`,
                  transition: "width 0.4s ease-out"
                }}
              />
            </div>
          </div>

          {/* Fats */}
          <div className="flex-col gap-xs" style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--border-frosted)" }}>
            <div className="flex-row justify-between items-center">
              <span style={{ fontSize: "12px", color: "var(--accent-muted)", fontWeight: 600 }}>Daily Fats Goal</span>
              <span style={{ fontSize: "11px", color: "var(--accent-muted)", fontWeight: 600 }}>
                {Math.round((todayFats / client.fatsTarget) * 100) || 0}% Completed
              </span>
            </div>
            <div className="flex-row items-baseline gap-xxs" style={{ margin: "4px 0" }}>
              <span style={{ color: "var(--accent-white)", fontSize: "20px", fontWeight: 800 }}>{todayFats}g</span>
              <span style={{ fontSize: "12px", color: "var(--accent-muted)" }}>/ {client.fatsTarget}g</span>
            </div>
            <div style={{ height: "6px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
              <div 
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg, #fb7185, #f43f5e)",
                  width: `${Math.min(100, (todayFats / client.fatsTarget) * 100)}%`,
                  transition: "width 0.4s ease-out"
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Logged Meals Feed */}
      <section className="glass-card flex-col gap-sm">
        <span className="text-heading" style={{ fontSize: "13px", color: "var(--accent-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Meal Log History (Last 30 Days)
        </span>

        {mealLogs.length === 0 ? (
          <div className="flex-col items-center justify-center text-center p-4" style={{ height: "150px" }}>
            <span style={{ color: "var(--accent-muted)", fontSize: "13px" }}>
              Your logged meals feed is empty. Tap &quot;Log Meal&quot; to add your first photo.
            </span>
          </div>
        ) : (
          <div className="flex-col gap-sm" style={{ marginTop: "4px" }}>
            {mealLogs.map((log) => (
              <div
                key={log.id}
                className="flex-col gap-sm p-sm meal-hover"
                style={{
                  border: "1px solid var(--border-frosted)",
                  borderRadius: "14px",
                  backgroundColor: "rgba(255, 255, 255, 0.01)"
                }}
              >
                <div className="flex-row gap-sm items-start">
                  {/* Photo thumbnail */}
                  {log.imageUrl ? (
                    <div
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "10px",
                        backgroundImage: `url(${log.imageUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        border: "1px solid var(--border-frosted)",
                        flexShrink: 0
                      }}
                    />
                  ) : (
                    <div
                      className="flex-row items-center justify-center"
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "10px",
                        border: "1px dashed var(--border-frosted)",
                        backgroundColor: "rgba(255, 255, 255, 0.02)",
                        color: "var(--accent-muted)",
                        flexShrink: 0
                      }}
                    >
                      <Utensils size={18} style={{ opacity: 0.3 }} />
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-col gap-xxs" style={{ flex: 1 }}>
                    <div className="flex-row justify-between items-start">
                      <span style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--accent-white)" }}>
                        {log.name}
                      </span>
                      <span style={{ fontSize: "10px", color: "var(--accent-muted)", display: "flex", alignItems: "center", gap: "3px" }}>
                        <Clock size={11} />
                        {formatLoggedTime(log.loggedAt)}
                      </span>
                    </div>

                    <div className="flex-row items-center gap-xs flex-wrap mt-xxs">
                      <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--accent-white)" }}>
                        +{log.calories} <span style={{ fontSize: "9px", fontWeight: 500, color: "var(--accent-muted)" }}>kcal</span>
                      </span>
                      <span style={{ fontSize: "10.5px", color: "var(--accent-muted)" }}>
                        Protein: {log.protein}g
                      </span>
                    </div>

                    {/* Trainer guidance response inside card */}
                    {log.trainerFeedback && (
                      <div 
                        className="flex-col gap-xxs mt-sm" 
                        style={{ 
                          backgroundColor: "rgba(16, 185, 129, 0.04)", 
                          border: "1px solid rgba(16, 185, 129, 0.15)", 
                          borderRadius: "8px", 
                          padding: "8px 10px" 
                        }}
                      >
                        <span style={{ fontSize: "9px", color: "var(--status-green)", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px", letterSpacing: "0.5px" }}>
                          <MessageSquare size={10} />
                          COACH RESPONSE
                        </span>
                        <p style={{ fontSize: "11.5px", color: "var(--accent-white)", margin: "2px 0 0 0", lineHeight: "1.3" }}>
                          {log.trainerFeedback}
                        </p>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Error Toast */}
      {errorMessage && (
        <div style={{
          position: "fixed",
          bottom: "80px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "var(--status-red)",
          color: "white",
          padding: "0.75rem 1.5rem",
          borderRadius: "8px",
          zIndex: 1000,
          maxWidth: "90%",
          textAlign: "center",
        }}>
          {errorMessage}
          <button 
            onClick={() => setErrorMessage(null)} 
            style={{ 
              marginLeft: "1rem", 
              background: "none", 
              border: "none", 
              color: "white", 
              cursor: "pointer",
              fontSize: "16px",
            }}
          >×</button>
        </div>
      )}

      {/* Bottom sliding Log Drawer */}
      {showLogDrawer && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            zIndex: 200,
            display: "flex",
            alignItems: "flex-end"
          }}
          onClick={() => setShowLogDrawer(false)}
        >
          <div
            className="flex-col gap-md animate-slide-up"
            style={{
              width: "100%",
              maxWidth: "430px",
              margin: "0 auto",
              backgroundColor: "var(--bg-primary)",
              borderTop: "1px solid var(--border-frosted)",
              borderTopLeftRadius: "20px",
              borderTopRightRadius: "20px",
              padding: "24px",
              maxHeight: "88vh",
              overflowY: "auto",
              color: "var(--accent-white)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-row justify-between items-center" style={{ borderBottom: "1px solid var(--border-frosted)", paddingBottom: "12px" }}>
              <span className="text-heading" style={{ fontSize: "18px" }}>Log Meal Submission</span>
              <button 
                onClick={() => setShowLogDrawer(false)}
                className="touch-action"
                style={{ background: "none", border: "none", color: "var(--accent-white)", cursor: "pointer", fontSize: "14px" }}
              >
                Cancel
              </button>
            </div>

            {logSuccess && (
              <div 
                style={{
                  backgroundColor: "var(--status-green)",
                  color: "black",
                  padding: "12px",
                  borderRadius: "12px",
                  fontWeight: 600,
                  fontSize: "13px",
                  textAlign: "center"
                }}
              >
                Meal successfully logged and compressed!
              </div>
            )}

            <form onSubmit={handleLogSubmit} className="flex-col gap-md">
              {/* Photo Input Dropzone */}
              <div className="flex-col gap-xs">
                <label style={{ fontSize: "10px", color: "var(--accent-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                  MEAL PHOTO
                </label>
                {imagePreview ? (
                  <div style={{ position: "relative", width: "100%", height: "200px", borderRadius: "12px", overflow: "hidden", border: "1px solid var(--border-frosted)" }}>
                    <div style={{ width: "100%", height: "100%", backgroundImage: `url(${imagePreview})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                    <button 
                      type="button" 
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      style={{ position: "absolute", top: "12px", right: "12px", backgroundColor: "rgba(0,0,0,0.6)", border: "none", color: "var(--accent-white)", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <label 
                    className="flex-col items-center justify-center gap-xs cursor-pointer"
                    style={{
                      height: "150px",
                      border: "1px dashed var(--border-frosted)",
                      borderRadius: "12px",
                      backgroundColor: "rgba(255, 255, 255, 0.01)",
                      color: "var(--accent-muted)",
                      transition: "all 0.2s"
                    }}
                  >
                    <Camera size={26} style={{ opacity: 0.6 }} />
                    <span style={{ fontSize: "12px" }}>Take Photo or Upload Image</span>
                    <span style={{ fontSize: "9px", opacity: 0.6 }}>High compression will be auto-applied</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" // support direct mobile camera trigger
                      onChange={handleImageChange}
                      style={{ display: "none" }}
                    />
                  </label>
                )}
              </div>

              {/* Name field */}
              <div className="flex-col gap-xs">
                <label style={{ fontSize: "10px", color: "var(--accent-muted)", fontWeight: 700, textTransform: "uppercase" }}>MEAL NAME / LABEL</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Steak, White Rice, & Salad"
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--border-frosted)",
                    borderRadius: "8px",
                    color: "var(--accent-white)",
                    fontSize: "14px",
                    padding: "8px 12px",
                    width: "100%",
                    outline: "none"
                  }}
                />
              </div>

              {/* Calories & Macros input fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="flex-col gap-xs">
                  <label style={{ fontSize: "10px", color: "var(--accent-muted)", fontWeight: 700, textTransform: "uppercase" }}>CALORIES (KCAL)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 650"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    style={{
                      backgroundColor: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--border-frosted)",
                      borderRadius: "8px",
                      color: "var(--accent-white)",
                      fontSize: "14px",
                      padding: "8px 12px",
                      width: "100%",
                      outline: "none"
                    }}
                  />
                </div>

                <div className="flex-col gap-xs">
                  <label style={{ fontSize: "10px", color: "var(--accent-muted)", fontWeight: 700, textTransform: "uppercase" }}>PROTEIN (G)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 45"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    style={{
                      backgroundColor: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--border-frosted)",
                      borderRadius: "8px",
                      color: "var(--accent-white)",
                      fontSize: "14px",
                      padding: "8px 12px",
                      width: "100%",
                      outline: "none"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="flex-col gap-xs">
                  <label style={{ fontSize: "10px", color: "var(--accent-muted)", fontWeight: 700, textTransform: "uppercase" }}>CARBS (G)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 80"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    style={{
                      backgroundColor: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--border-frosted)",
                      borderRadius: "8px",
                      color: "var(--accent-white)",
                      fontSize: "14px",
                      padding: "8px 12px",
                      width: "100%",
                      outline: "none"
                    }}
                  />
                </div>

                <div className="flex-col gap-xs">
                  <label style={{ fontSize: "10px", color: "var(--accent-muted)", fontWeight: 700, textTransform: "uppercase" }}>FATS (G)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 25"
                    value={fats}
                    onChange={(e) => setFats(e.target.value)}
                    style={{
                      backgroundColor: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--border-frosted)",
                      borderRadius: "8px",
                      color: "var(--accent-white)",
                      fontSize: "14px",
                      padding: "8px 12px",
                      width: "100%",
                      outline: "none"
                    }}
                  />
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loggingMeal || !mealName.trim()}
                className="btn-primary w-full mt-sm"
                style={{ height: "48px", fontSize: "14px", fontWeight: 700, color: "var(--bg-primary)" }}
              >
                {loggingMeal ? "Compressing & Saving..." : "SUBMIT MEAL LOG"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
