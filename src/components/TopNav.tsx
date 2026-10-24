"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, Map, FlaskConical, GitCompareArrows, Scale, BookOpen } from "lucide-react";
import { cx } from "@/lib/format";

const LINKS = [
  { href: "/", label: "Explore Map", icon: Map },
  { href: "/scenario-lab", label: "Scenario Lab", icon: FlaskConical },
  { href: "/compare", label: "Compare Sites", icon: GitCompareArrows },
  { href: "/policy", label: "Massachusetts Policy", icon: Scale },
  { href: "/methodology", label: "Data & Methodology", icon: BookOpen },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <header className="no-print z-20 flex h-12 shrink-0 items-center justify-between border-b border-border bg-panel px-4">
      <Link href="/" className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/20 text-accent">
          <Database size={16} />
        </span>
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-tight text-content">
            Data<span className="text-accent">Daddy</span>
          </div>
          <div className="text-[9px] uppercase tracking-widest text-muted">
            Putting data centers in their place
          </div>
        </div>
      </Link>
      <nav className="flex items-center gap-1">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cx(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                active
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:bg-panel-2 hover:text-content",
              )}
            >
              <Icon size={14} />
              <span className="hidden md:inline">{label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
