"use client";

import { useRouter } from "next/navigation";
import ClientBottomNav from "@/components/ClientBottomNav";
import { logout } from "@/app/actions";
import { LogOut } from "lucide-react";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isOnline = useOnlineStatus();

  const handleSignOut = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      const res = await logout();
      if (res.success) {
        router.push("/login");
        router.refresh();
      } else {
        alert("Logout failed. Please try again.");
      }
    }
  };

  return (
    <div className="app-container">
      {/* Client Status Header */}
      <header className="status-header flex-row items-center justify-between">
        <div className="flex-row items-center gap-xs">
          <span 
            className="status-dot" 
            style={{ 
              backgroundColor: isOnline ? "var(--status-green)" : "var(--status-yellow)",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              display: "inline-block"
            }} 
          />
          <span style={{ fontSize: "11px", fontWeight: 700, color: isOnline ? "var(--status-green)" : "var(--status-yellow)" }}>
            {isOnline ? "SYNCED" : "CONNECTION LOST"}
          </span>
        </div>
        <div className="flex-row items-center gap-sm">
          <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.05em", color: "var(--accent-muted)" }}>
            ATHLETE PORTAL
          </span>
          <button 
            onClick={handleSignOut}
            title="Sign Out"
            className="touch-action"
            style={{
              background: "none",
              border: "none",
              color: "var(--accent-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px"
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Contents */}
      <main className="content-scrollable">
        {children}
      </main>

      {/* Sticky Bottom Nav Bar */}
      <ClientBottomNav />
    </div>
  );
}
