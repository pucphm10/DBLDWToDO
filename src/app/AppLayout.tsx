import {
  BookTemplate, CalendarCheck, ChevronRight, LayoutDashboard, Lightbulb,
  LogOut, Menu, Plus, Settings, X
} from "lucide-react";
import { useState } from "react";
import { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { Button } from "../components/ui";
import { cn } from "../lib/utils";
import { seedWorkspace } from "../features/data/api";

const links = [
  { to: "/", label: "Übersicht", icon: LayoutDashboard },
  { to: "/productions", label: "Produktionen", icon: CalendarCheck },
  { to: "/templates", label: "Vorlagen", icon: BookTemplate },
  { to: "/learning", label: "Lernen", icon: Lightbulb },
  { to: "/settings", label: "Einstellungen", icon: Settings }
];

function Logo() {
  return <div className="flex items-center gap-3">
    <div className="grid size-10 place-items-center rounded-xl bg-sun font-display text-sm font-black text-ink">DW</div>
    <div><p className="font-display text-sm font-extrabold leading-tight">DBLDW</p><p className="text-[11px] font-medium text-black/40">Production</p></div>
  </div>;
}

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const { signOut, user } = useAuth();
  const location = useLocation();
  const current = links.find((link) => link.to === "/" ? location.pathname === "/" : location.pathname.startsWith(link.to));

  useEffect(() => {
    if (user) void seedWorkspace().catch(() => undefined);
  }, [user]);

  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-black/[0.06] bg-white px-4 py-5 lg:flex">
        <div className="px-2"><Logo /></div>
        <nav className="mt-9 grid gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition",
              isActive ? "bg-moss-100 text-moss-900" : "text-black/50 hover:bg-black/[0.03] hover:text-ink"
            )}><Icon size={18} />{label}</NavLink>
          ))}
        </nav>
        <div className="mt-auto grid gap-3">
          <NavLink to="/productions/new"><Button className="w-full"><Plus size={17} />Neue Produktion</Button></NavLink>
          <button onClick={() => void signOut()} className="flex items-center gap-3 px-3 py-2 text-sm font-semibold text-black/45 hover:text-ink">
            <LogOut size={17} />Abmelden
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-black/[0.06] bg-paper/90 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Navigation öffnen"><Menu size={21} /></Button>
            <div><p className="text-xs font-semibold text-black/35">DBLDW Production</p><h1 className="font-display text-base font-bold">{current?.label ?? "Arbeitsbereich"}</h1></div>
          </div>
          <NavLink to="/productions/new" className="sm:hidden"><Button size="icon" aria-label="Neue Produktion"><Plus size={20} /></Button></NavLink>
          <NavLink to="/productions/new" className="hidden sm:block"><Button size="sm"><Plus size={16} />Neue Produktion</Button></NavLink>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 pb-24 sm:px-7 lg:px-10 lg:py-9"><Outlet /></main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-black/10 bg-white/95 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-xl lg:hidden">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => cn(
            "grid min-h-14 place-items-center rounded-xl text-[10px] font-semibold",
            isActive ? "text-moss-700" : "text-black/40"
          )}><Icon size={19} /><span>{label === "Einstellungen" ? "Mehr" : label}</span></NavLink>
        ))}
      </nav>

      {open && <div className="fixed inset-0 z-50 bg-ink/35 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}>
        <aside className="h-full w-[min(86vw,320px)] bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between"><Logo /><Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X size={20} /></Button></div>
          <nav className="mt-9 grid gap-1">{links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)} className="flex min-h-12 items-center justify-between rounded-xl px-3 font-semibold text-black/60 hover:bg-moss-50">
              <span className="flex items-center gap-3"><Icon size={18} />{label}</span><ChevronRight size={16} />
            </NavLink>
          ))}</nav>
        </aside>
      </div>}
    </div>
  );
}
