import { clsx } from "clsx";

export const Button = ({ variant = "default", className, ...props }) => {
  const base = "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed";
  const variants = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    primary: "bg-indigo-600 text-white hover:bg-indigo-500",
    secondary: "bg-slate-800 text-slate-100 hover:bg-slate-700",
    accent: "bg-amber-400 text-slate-950 hover:bg-amber-300",
    ghost: "bg-transparent text-slate-100 hover:bg-slate-900/70 border border-slate-700",
  };
  return <button className={clsx(base, variants[variant], className)} {...props} />;
};
