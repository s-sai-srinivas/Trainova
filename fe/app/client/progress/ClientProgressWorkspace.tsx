"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { LineChart, Image as ImageIcon, Flame, Upload, Camera, Trash2, AlertCircle, ChevronRight } from "lucide-react";
import { uploadProgressPhoto } from "@/app/actions";

interface CheckInItem {
  date: string;
  weight: number | null;
}

interface PhotoSet {
  date: string;
  photoFrontUrl: string | null;
  photoSideUrl: string | null;
}

interface ClientProgressWorkspaceProps {
  clientId: string;
  clientName: string;
  checkIns: CheckInItem[];
  photos: PhotoSet[];
}

export default function ClientProgressWorkspace({
  clientId,
  clientName,
  checkIns,
  photos,
}: ClientProgressWorkspaceProps) {
  const router = useRouter();
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Upload state
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [sidePreview, setSidePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);

  // Hidden input refs
  const fileInputFrontRef = useRef<HTMLInputElement>(null);
  const fileInputSideRef = useRef<HTMLInputElement>(null);

  // Drag interaction handlers for side-by-side comparator
  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleTouchStart = () => {
    isDragging.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    if (e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  // Compress and encode file to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "front" | "side") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Compress image before storing in state
      const img = new window.Image();
      img.src = base64String;
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
          const compressed = canvas.toDataURL("image/jpeg", 0.4);
          if (type === "front") {
            setFrontPreview(compressed);
          } else {
            setSidePreview(compressed);
          }
        } else {
          // Fallback to raw if canvas fails
          if (type === "front") {
            setFrontPreview(base64String);
          } else {
            setSidePreview(base64String);
          }
        }
      };
      img.onerror = () => {
        if (type === "front") {
          setFrontPreview(base64String);
        } else {
          setSidePreview(base64String);
        }
      };
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontPreview && !sidePreview) {
      setErrorMsg("Please select at least one progress photo (Front or Side) to upload.");
      return;
    }

    setUploading(true);
    setErrorMsg(null);

    try {
      const res = await uploadProgressPhoto(frontPreview, sidePreview);
      if (res.success) {
        setFrontPreview(null);
        setSidePreview(null);
        setShowUploadForm(false);
        router.refresh();
      } else {
        setErrorMsg(res.error || "Failed to upload progress photos.");
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred during photo upload.");
    } finally {
      setUploading(false);
    }
  };

  // Render SVG Weight Trend Chart
  const renderWeightChart = () => {
    const validCheckins = checkIns.filter((c) => c.weight !== null) as { date: string; weight: number }[];
    if (validCheckins.length === 0) {
      return (
        <div className="flex-col items-center justify-center text-center" style={{ height: "160px", color: "var(--accent-muted)" }}>
          No weight entries logged yet. Complete check-ins to view trends.
        </div>
      );
    }

    const weights = validCheckins.map((c) => c.weight);
    const maxWeight = Math.max(...weights) + 1;
    const minWeight = Math.min(...weights) - 1;
    const weightRange = maxWeight - minWeight || 2;

    const width = 350;
    const height = 160;
    const padding = 20;

    const points = validCheckins.map((c, idx) => {
      const x = padding + (idx / (validCheckins.length - 1 || 1)) * (width - padding * 2);
      const y = height - padding - ((c.weight - minWeight) / weightRange) * (height - padding * 2);
      return { x, y, weight: c.weight, date: new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) };
    });

    // Generate smooth bezier line command (C)
    let pathD = "";
    if (points.length > 0) {
      pathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cp1x = p0.x + (p1.x - p0.x) / 3;
        const cp1y = p0.y;
        const cp2x = p0.x + 2 * (p1.x - p0.x) / 3;
        const cp2y = p1.y;
        pathD += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p1.x} ${p1.y}`;
      }
    }

    let areaD = "";
    if (points.length > 0) {
      areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
    }

    return (
      <div className="flex-col items-center gap-xs" style={{ width: "100%" }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
          <defs>
            <linearGradient id="weightAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--status-green)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--status-green)" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="weightLineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--status-green)" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="var(--status-green)" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Grid lines */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border-frosted)" strokeWidth={1} />
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--border-frosted)" strokeWidth={1} strokeDasharray="4" />

          {/* Gradient Filled Area */}
          {validCheckins.length > 1 && (
            <path
              d={areaD}
              fill="url(#weightAreaGradient)"
            />
          )}

          {/* Bezier Trend Line */}
          {validCheckins.length > 1 && (
            <path
              d={pathD}
              fill="none"
              stroke="url(#weightLineGradient)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#lineGlow)"
            />
          )}

          {/* Data Points */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle
                cx={p.x}
                cy={p.y}
                r={4.5}
                fill="var(--bg-primary)"
                stroke="var(--status-green)"
                strokeWidth={2.5}
              />
              <text
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                fill="var(--accent-white)"
                fontSize={10}
                fontWeight={700}
              >
                {p.weight}
              </text>
              {idx % 2 === 0 && (
                <text
                  x={p.x}
                  y={height - 4}
                  textAnchor="middle"
                  fill="var(--accent-muted)"
                  fontSize={8}
                >
                  {p.date}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    );
  };

  // Layout Logic for Comparator Slider Images
  const hasPhotos = photos.length > 0;
  
  let beforeUrl = "";
  let afterUrl = "";
  let beforeLabel = "Before";
  let afterLabel = "After";

  if (photos.length >= 2) {
    const oldestSet = photos[photos.length - 1];
    const newestSet = photos[0];
    beforeUrl = oldestSet.photoFrontUrl || "";
    afterUrl = newestSet.photoFrontUrl || "";
    beforeLabel = `Before (${new Date(oldestSet.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;
    afterLabel = `After (${new Date(newestSet.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;
  } else if (photos.length === 1) {
    // Single set: compare Front vs Side profile
    beforeUrl = photos[0].photoFrontUrl || "";
    afterUrl = photos[0].photoSideUrl || photos[0].photoFrontUrl || "";
    beforeLabel = `Front (${new Date(photos[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;
    afterLabel = `Side Profile`;
  }

  return (
    <div 
      className="flex-col gap-md"
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleTouchEnd}
    >
      {/* Streak Achievements */}
      <section className="glass-card flex-row gap-md items-center" style={{ padding: "16px", marginBottom: "4px" }}>
        <div 
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "10px",
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--border-frosted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent-white)"
          }}
        >
          <Flame size={20} className="text-white" />
        </div>
        <div className="flex-col gap-xs" style={{ flex: 1 }}>
          <span style={{ fontSize: "11px", color: "var(--accent-muted)", fontWeight: 700 }}>CONSISTENCY STREAK</span>
          <span className="text-heading" style={{ fontSize: "16px", letterSpacing: "0.02em" }}>Keep up the momentum!</span>
        </div>
      </section>

      {/* SVG Weight Line Chart */}
      <section className="glass-card flex-col gap-md" style={{ padding: "20px" }}>
        <div className="flex-row items-center gap-xs" style={{ borderBottom: "1px solid var(--border-frosted)", paddingBottom: "12px" }}>
          <LineChart size={16} color="var(--accent-muted)" />
          <span className="text-heading" style={{ fontSize: "14px", color: "var(--accent-muted)" }}>Weight Log Trend</span>
        </div>
        {renderWeightChart()}
      </section>

      {/* Progression Photo Slider & Uploader */}
      <section className="glass-card flex-col gap-md" style={{ padding: "20px" }}>
        <div className="flex-row justify-between items-center" style={{ borderBottom: "1px solid var(--border-frosted)", paddingBottom: "12px" }}>
          <div className="flex-row items-center gap-xs">
            <ImageIcon size={16} color="var(--accent-muted)" />
            <span className="text-heading" style={{ fontSize: "14px", color: "var(--accent-muted)" }}>Progression Comparator</span>
          </div>

          {hasPhotos && !showUploadForm && (
            <button
              onClick={() => setShowUploadForm(true)}
              className="btn-secondary"
              style={{ padding: "6px 12px", fontSize: "11px", borderRadius: "8px" }}
            >
              Upload New
            </button>
          )}
        </div>

        {/* 1. UPLOADER COMPONENT SHEET (inline or primary if empty) */}
        {(showUploadForm || !hasPhotos) ? (
          <form onSubmit={handleUploadSubmit} className="flex-col gap-md">
            <div className="flex-col gap-xs">
              <span style={{ fontSize: "14px", fontWeight: 700 }}>Upload Progress Photos</span>
              <span style={{ fontSize: "12px", color: "var(--accent-muted)" }}>
                Add your front and side profiles to track visual gains.
              </span>
            </div>

            {errorMsg && (
              <div className="flex-row items-center gap-xs" style={{ color: "var(--status-red)", fontSize: "13px", backgroundColor: "rgba(239, 68, 68, 0.08)", padding: "10px", borderRadius: "8px" }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {/* Front view Dropzone */}
              <div 
                className="photo-dropzone"
                onClick={() => fileInputFrontRef.current?.click()}
              >
                <input 
                  type="file"
                  ref={fileInputFrontRef}
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "front")}
                  style={{ display: "none" }}
                />
                
                {frontPreview ? (
                  <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: "10px", overflow: "hidden" }}>
                    <img src={frontPreview} alt="Front View" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFrontPreview(null);
                      }}
                      style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.6)", border: "none", color: "white", padding: "6px", borderRadius: "50%", cursor: "pointer" }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Camera size={22} style={{ color: "var(--accent-muted)", marginBottom: "6px" }} />
                    <span style={{ fontSize: "12px", fontWeight: 600 }}>Front Profile</span>
                    <span style={{ fontSize: "10px", color: "var(--accent-muted)" }}>Select image</span>
                  </>
                )}
              </div>

              {/* Side view Dropzone */}
              <div 
                className="photo-dropzone"
                onClick={() => fileInputSideRef.current?.click()}
              >
                <input 
                  type="file"
                  ref={fileInputSideRef}
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "side")}
                  style={{ display: "none" }}
                />
                
                {sidePreview ? (
                  <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: "10px", overflow: "hidden" }}>
                    <img src={sidePreview} alt="Side View" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSidePreview(null);
                      }}
                      style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.6)", border: "none", color: "white", padding: "6px", borderRadius: "50%", cursor: "pointer" }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Camera size={22} style={{ color: "var(--accent-muted)", marginBottom: "6px" }} />
                    <span style={{ fontSize: "12px", fontWeight: 600 }}>Side Profile</span>
                    <span style={{ fontSize: "10px", color: "var(--accent-muted)" }}>Select image</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex-row gap-sm mt-xs">
              <button
                type="submit"
                disabled={uploading || (!frontPreview && !sidePreview)}
                className="btn-primary"
                style={{ flex: 1, height: "40px", fontSize: "13px" }}
              >
                {uploading ? "Saving Photos..." : "Save Progress Photos"}
              </button>

              {hasPhotos && (
                <button
                  type="button"
                  onClick={() => {
                    setFrontPreview(null);
                    setSidePreview(null);
                    setErrorMsg(null);
                    setShowUploadForm(false);
                  }}
                  className="btn-secondary"
                  style={{ height: "40px", fontSize: "13px", padding: "0 16px" }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        ) : (
          /* 2. SLIDER COMPARATOR COMPONENT */
          <div className="flex-col gap-sm">
            <div 
              ref={containerRef}
              style={{
                position: "relative",
                width: "100%",
                height: "320px",
                borderRadius: "12px",
                overflow: "hidden",
                userSelect: "none",
                cursor: "ew-resize",
                border: "1px solid var(--border-frosted)"
              }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              {/* Before Photo */}
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundImage: `url(${beforeUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center"
              }} />

              {/* After Photo (Draggable Split) */}
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${sliderPosition}%`,
                height: "100%",
                backgroundImage: `url(${afterUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                borderRight: "2px solid var(--accent-white)",
                boxShadow: "0 0 15px rgba(0,0,0,0.6)"
              }} />

              {/* Draggable Knob */}
              <div style={{
                position: "absolute",
                top: "50%",
                left: `${sliderPosition}%`,
                transform: "translate(-50%, -50%)",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "var(--accent-white)",
                border: "3px solid var(--bg-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: 10,
                boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
              }}>
                <div style={{ display: "flex", gap: "3px" }}>
                  <div style={{ width: "2px", height: "12px", backgroundColor: "var(--bg-primary)" }} />
                  <div style={{ width: "2px", height: "12px", backgroundColor: "var(--bg-primary)" }} />
                </div>
              </div>

              {/* Before Overlay Label */}
              <span style={{
                position: "absolute",
                bottom: "12px",
                left: "12px",
                backgroundColor: "rgba(0,0,0,0.7)",
                backdropFilter: "blur(4px)",
                color: "white",
                padding: "4px 8px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 700,
                zIndex: 11
              }}>
                {beforeLabel}
              </span>

              {/* After Overlay Label */}
              <span style={{
                position: "absolute",
                bottom: "12px",
                right: "12px",
                backgroundColor: "rgba(0,0,0,0.7)",
                backdropFilter: "blur(4px)",
                color: "white",
                padding: "4px 8px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 700,
                zIndex: 11
              }}>
                {afterLabel}
              </span>
            </div>
            
            {photos.length === 1 && (
              <span style={{ fontSize: "11px", color: "var(--accent-muted)", fontStyle: "italic", textAlign: "center", display: "block", marginTop: "4px" }}>
                Tip: Upload another progress set to compare your week-over-week timeline!
              </span>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
