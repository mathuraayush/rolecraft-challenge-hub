import { forwardRef } from "react";
import { clsx } from "clsx";

export const Input = forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={clsx(
      "w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300/40",
      className
    )}
    {...props}
  />
));

Input.displayName = "Input";
