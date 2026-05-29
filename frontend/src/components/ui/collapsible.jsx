import { useState } from "react";
import { clsx } from "clsx";

export const Collapsible = ({ title, children, className }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={clsx("rounded-3xl border border-slate-800 bg-slate-950", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-semibold text-white"
      >
        <span>{title}</span>
        <span className="text-slate-400">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="border-t border-slate-800 px-5 py-4 text-sm text-slate-300">{children}</div>}
    </div>
  );
};
