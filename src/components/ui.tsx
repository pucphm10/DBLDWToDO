import {
  Check, ChevronDown, CircleAlert, LoaderCircle, X, type LucideIcon
} from "lucide-react";
import {
  forwardRef, type ButtonHTMLAttributes, type HTMLAttributes,
  type InputHTMLAttributes, type ReactNode
} from "react";
import { cn } from "../lib/utils";

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
}>(({ className, variant = "primary", size = "md", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      variant === "primary" && "bg-moss-600 text-white shadow-sm hover:bg-moss-700",
      variant === "secondary" && "border border-black/10 bg-white text-ink hover:bg-black/[0.03]",
      variant === "ghost" && "text-black/60 hover:bg-black/[0.05] hover:text-ink",
      variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
      size === "md" && "min-h-11 px-4 py-2.5 text-sm",
      size === "sm" && "min-h-9 px-3 py-1.5 text-xs",
      size === "icon" && "size-10",
      className
    )}
    {...props}
  />
));
Button.displayName = "Button";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(
      "min-h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-ink outline-none placeholder:text-black/35 focus:border-moss-500 focus:ring-2 focus:ring-moss-100",
      className
    )} {...props} />
  )
);
Input.displayName = "Input";

export function Field({ label, error, children, hint }: {
  label: string; error?: string; hint?: string; children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-ink">
      {label}
      {children}
      {hint && !error && <span className="text-xs font-normal text-black/45">{hint}</span>}
      {error && <span className="text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-black/[0.07] bg-white shadow-soft", className)} {...props} />;
}

export function Badge({ children, tone = "neutral" }: {
  children: ReactNode; tone?: "neutral" | "green" | "amber" | "red" | "blue";
}) {
  return <span className={cn(
    "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide",
    tone === "neutral" && "bg-black/[0.05] text-black/55",
    tone === "green" && "bg-emerald-100 text-emerald-800",
    tone === "amber" && "bg-amber-100 text-amber-800",
    tone === "red" && "bg-red-100 text-red-700",
    tone === "blue" && "bg-blue-100 text-blue-700"
  )}>{children}</span>;
}

export function Progress({ value, label }: { value: number; label?: string }) {
  return (
    <div className="grid gap-1.5">
      {label && <div className="flex justify-between text-xs font-medium text-black/50"><span>{label}</span><span>{value}%</span></div>}
      <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]">
        <div className="h-full rounded-full bg-moss-500 transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: {
  icon: LucideIcon; title: string; description: string; action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-black/15 bg-white/60 px-6 py-14 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-moss-100 text-moss-700"><Icon size={22} /></div>
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-black/50">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingScreen() {
  return <div className="grid min-h-screen place-items-center bg-paper"><LoaderCircle className="animate-spin text-moss-600" aria-label="Lädt" /></div>;
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" | "success" }) {
  const Icon = tone === "success" ? Check : tone === "error" ? CircleAlert : ChevronDown;
  return <div className={cn(
    "flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm",
    tone === "info" && "bg-blue-50 text-blue-800",
    tone === "error" && "bg-red-50 text-red-700",
    tone === "success" && "bg-emerald-50 text-emerald-800"
  )}><Icon className="mt-0.5 shrink-0" size={16} /><span>{children}</span></div>;
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/35 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="max-h-[92vh] w-full overflow-auto rounded-t-3xl bg-paper p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Schließen"><X size={20} /></Button>
        </div>
        {children}
      </div>
    </div>
  );
}
