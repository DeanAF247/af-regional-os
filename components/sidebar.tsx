"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Building2,
  BarChart3,
  Megaphone,
  Package,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Briefcase,
  FolderKanban,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const CLUBS = [
  { name: "Greenhills",     slug: "greenhills" },
  { name: "Thornton",       slug: "thornton" },
  { name: "Newcastle West", slug: "newcastle-west" },
  { name: "Kotara",         slug: "kotara" },
  { name: "Edgeworth",      slug: "edgeworth" },
  { name: "Lake Haven",     slug: "lake-haven" },
];

const NAV_ITEMS = [
  {
    label: "Performance",
    href: "/",
    icon: BarChart3,
    children: [
      { label: "Group Overview", href: "/" },
      { label: "Year Overview",  href: "/kpis/year" },
      { label: "Membership",     href: "/memberships" },
      { label: "Enter KPIs",     href: "/kpis/upload" },
    ],
  },
  {
    label: "Clubs",
    href: "/clubs",
    icon: Building2,
    children: CLUBS.map((c) => ({
      label: c.name,
      href: `/clubs/${c.slug}`,
    })),
  },
  {
    label: "Operations",
    href: "/sops",
    icon: Briefcase,
    children: [
      { label: "SOPs",     href: "/sops" },
      { label: "Vendors",  href: "/vendors" },
    ],
  },
  {
    label: "Marketing",
    href: "/marketing",
    icon: Megaphone,
    children: [
      { label: "Campaigns",     href: "/marketing" },
      { label: "Year Overview", href: "/marketing/year" },
    ],
  },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
    children: [],
  },
];

function NavItem({
  item,
  depth = 0,
}: {
  item: (typeof NAV_ITEMS)[number];
  depth?: number;
}) {
  const pathname = usePathname();
  const Icon = item.icon;
  const hasChildren = !!(item.children && item.children.length > 0);

  const childActive = item.children?.some((c) =>
    c.href === "/" ? pathname === "/" : pathname === c.href || pathname.startsWith(c.href + "/")
  ) ?? false;

  const [open, setOpen] = useState(() => childActive || pathname === item.href);

  const isActive = hasChildren
    ? false
    : item.href === "/"
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all duration-150 group",
          depth === 0 ? "mx-2" : "mx-2 ml-6",
          isActive && !hasChildren
            ? "bg-[#3B1F7A] text-[#A78BFA]"
            : "text-[#94A3B8] hover:bg-[#1A1F35] hover:text-[#F1F5F9]"
        )}
        onClick={() => {
          if (hasChildren) setOpen(!open);
        }}
      >
        {Icon && (
          <Icon
            size={16}
            className={cn(
              "flex-shrink-0",
              isActive && !hasChildren ? "text-[#A78BFA]" : "text-[#64748B] group-hover:text-[#94A3B8]"
            )}
          />
        )}
        {hasChildren ? (
          <span className="flex-1">{item.label}</span>
        ) : (
          <Link href={item.href} className="flex-1">
            {item.label}
          </Link>
        )}
        {hasChildren && (
          <span className="text-[#64748B]">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
      </div>

      {hasChildren && open && (
        <div className="mt-0.5 mb-1">
          {item.children!.map((child) => {
            const childActive = child.href === "/" ? pathname === "/" : pathname === child.href;
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 mx-2 ml-8 rounded-lg text-[13px] transition-all duration-150",
                  childActive
                    ? "text-[#A78BFA] bg-[#3B1F7A]/60"
                    : "text-[#64748B] hover:text-[#94A3B8] hover:bg-[#1A1F35]"
                )}
              >
                <span className={cn("w-1 h-1 rounded-full flex-shrink-0", childActive ? "bg-[#A78BFA]" : "bg-[#252B45]")} />
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#252B45] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">AF</span>
          </div>
          <div>
            <div className="text-[#F1F5F9] font-bold text-[15px] leading-tight">Regional OS</div>
            <div className="text-[#64748B] text-[11px]">Anytime Fitness</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-[#252B45] p-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#64748B] hover:text-[#EF4444] hover:bg-[#7F1D1D]/20 transition-all duration-150"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#0B0E1A] border-r border-[#252B45] fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#131729] border border-[#252B45] rounded-lg text-[#94A3B8]"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 w-64 bg-[#0B0E1A] border-r border-[#252B45] z-50 flex flex-col">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
