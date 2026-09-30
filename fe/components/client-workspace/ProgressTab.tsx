"use client";

import { useState, useRef, useEffect } from "react";

interface CheckIn {
  date: string;
  weight: number | null;
}

interface PhotoSet {
  date: string;
  photoFrontUrl: string | null;
  photoSideUrl: string | null;
}

interface ProgressTabProps {
  checkIns: CheckIn[];
  photos: PhotoSet[];
}

export default function ProgressTab({ checkIns, photos }: ProgressTabProps) {
  // Slider position state
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const activePhotos = photos.length >= 2 ? photos : [];

  const handleTouchStart = () => { isDragging.current = true; };
  const handleMouseDown = () => { isDragging.current = true; };

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pos = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
      setSliderPosition(Math.max(0, Math.min(100, pos)));
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pos = ((e.clientX - rect.left) / rect.width) * 100;
      setSliderPosition(Math.max(0, Math.min(100, pos)));
    };
    const release = () => { isDragging.current = false; };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", release);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", release);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", release);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", release);
    };
  }, []);

  const renderWeightChart = () => {
    const valid = checkIns.filter(c => c.weight !== null) as { date: string; weight: number }[];
    if (valid.length < 2) return <span style={{ color: "var(--accent-muted)" }}>Insufficient logs for trend chart.</span>;
    const wArray = valid.map(c => c.weight);
    const minW = Math.min(...wArray) - 0.5;
    const maxW = Math.max(...wArray) + 0.5;
    const range = maxW - minW || 1;
    const width = 350;
    const height = 120;
    const padding = 20;

    const points = valid.map((c, i) => ({
      x: padding + (i / (valid.length - 1)) * (width - padding * 2),
      y: height - padding - ((c.weight - minW) / range) * (height - padding * 2)
    }));

    const pathD = points.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, "");

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <path d={pathD} fill="none" stroke="var(--accent-white)" strokeWidth={2.5} />
        {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--accent-white)" />)}
      </svg>
    );
  };

  return (
    <div className="flex-col gap-md">
      {/* weight line graph */}
      <section className="glass-card flex-col gap-sm">
        <span className="text-heading" style={{ fontSize: "14px", fontWeight: 700 }}>Bodyweight Progression Index</span>
        <div style={{ padding: "12px", backgroundColor: "rgba(0,0,0,0.1)", borderRadius: "8px", border: "1px solid var(--border-frosted)" }}>
          {renderWeightChart()}
        </div>
      </section>

      {/* photo comparator */}
      <section className="glass-card flex-col gap-sm">
        <span className="text-heading" style={{ fontSize: "14px", fontWeight: 700 }}>Progress Photo Split Comparator</span>
        {photos.length < 2 ? (
          <div 
            style={{ 
              border: "1px dashed var(--border-frosted)", 
              borderRadius: "12px", 
              padding: "40px 16px", 
              textAlign: "center", 
              color: "var(--accent-muted)",
              fontSize: "13px"
            }}
          >
            Upload at least two progress photo sets from the Client Tab to use the swipe comparison tool.
          </div>
        ) : (
          <div 
            ref={containerRef}
            style={{ position: "relative", width: "100%", height: "280px", borderRadius: "10px", overflow: "hidden", cursor: "ew-resize" }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundImage: `url(${activePhotos[0]?.photoFrontUrl})`, backgroundSize: "cover", backgroundPosition: "center" }} />
            <div style={{ position: "absolute", top: 0, left: 0, width: `${sliderPosition}%`, height: "100%", backgroundImage: `url(${activePhotos[1]?.photoFrontUrl})`, backgroundSize: "cover", backgroundPosition: "center", borderRight: "2px solid var(--accent-white)" }} />
            <div style={{ position: "absolute", top: "50%", left: `${sliderPosition}%`, transform: "translate(-50%, -50%)", width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "var(--accent-white)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ display: "flex", gap: "2px" }}>
                <div style={{ width: "2px", height: "10px", backgroundColor: "var(--bg-primary)" }} />
                <div style={{ width: "2px", height: "10px", backgroundColor: "var(--bg-primary)" }} />
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
