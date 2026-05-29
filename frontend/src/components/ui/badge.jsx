import { clsx } from "clsx";

export const Badge = ({ variant = "default", className, children }) => {
  const base = "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]";
  const variants = {
    default: "bg-slate-800 text-slate-200",
    info: "bg-indigo-600 text-white",
    success: "bg-emerald-500 text-slate-950",
    warning: "bg-amber-400 text-slate-950",
    danger: "bg-rose-500 text-white",
    subtle: "bg-slate-700 text-slate-300",
  };
  return <span className={clsx(base, variants[variant], className)}>{children}</span>;
};
