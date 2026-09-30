"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Users, ClipboardList, Settings } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Feed", path: "/trainer/dashboard", icon: Activity },
    { name: "Clients", path: "/trainer/clients", icon: Users },
    { name: "Plans", path: "/trainer/plans", icon: ClipboardList },
    { name: "Settings", path: "/trainer/settings", icon: Settings },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        // Match active paths (exact match or prefix for nested paths)
        const isActive = pathname === item.path || (item.path !== "/trainer/dashboard" && pathname.startsWith(item.path));
        
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`nav-item ${isActive ? "active" : ""}`}
          >
            <Icon size={22} strokeWidth={2} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
