"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, TrendingUp, Camera } from "lucide-react";

export default function ClientBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Today", path: "/client/today", icon: Calendar },
    { name: "Meals", path: "/client/meals", icon: Camera },
    { name: "Progress", path: "/client/progress", icon: TrendingUp },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.path || (item.path !== "/client/today" && pathname.startsWith(item.path));
        
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
