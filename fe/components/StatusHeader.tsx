"use client";

import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/app/actions";
import { APP_CONFIG } from "@/lib/config";
import { LogOut } from "lucide-react";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";

export default function StatusHeader() {
  const isOnline = useOnlineStatus();
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    if (confirm(`Are you sure you want to sign out of ${APP_CONFIG.BRAND_NAME}?`)) {
      const res = await logout();
      if (res.success) {
        router.push("/login");
        router.refresh();
      }
    }
  };

  // Hide on login, client, and client invite views
  const showLogout = pathname !== "/login" && !pathname.startsWith("/invite") && !pathname.startsWith("/client");

  return (
    <header className="sticky-header flex-row items-center justify-between w-full">
      <div className="flex-row items-center gap-sm">
        <span className="text-heading" style={{ fontSize: "18px", letterSpacing: "0.1em" }}>{APP_CONFIG.BRAND_NAME}</span>
      </div>
      <div className="flex-row items-center gap-md">
        <div className="flex-row items-center gap-sm">
          <span 
            className={`status-pill ${isOnline ? "green" : "yellow"}`} 
            style={{ animation: isOnline ? "none" : "pulse 1.5s infinite" }}
          />
          <span style={{ fontSize: "12px", color: "var(--accent-muted)" }}>
            {isOnline ? "Synced" : "Offline"}
          </span>
        </div>
        {showLogout && (
          <button 
            onClick={handleSignOut}
            title="Sign Out"
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
        )}
      </div>
    </header>
  );
}
