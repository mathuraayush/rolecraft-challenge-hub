import { forwardRef } from "react";
import { clsx } from "clsx";

export const Textarea = forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={clsx(
      "min-h-[120px] w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300/40",
      className
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";
