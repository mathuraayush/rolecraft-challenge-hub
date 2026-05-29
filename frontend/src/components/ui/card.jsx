import { clsx } from "clsx";

export const Card = ({ className, children, ...props }) => (
  <div className={clsx("rounded-[28px] border border-slate-800 bg-[#111012] p-6 shadow-xl shadow-slate-950/20", className)} {...props}>
    {children}
  </div>
);
