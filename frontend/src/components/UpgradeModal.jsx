import { useState } from "react";
import { useToast } from "./ToastProvider";
import { api } from "../lib/api";

const plans = [
  { type: "monthly", label: "Monthly", price: "₹2,999", description: "20 contacts / month" },
  { type: "annual", label: "Annual", price: "₹24,999", description: "Unlimited contacts, save 30%" },
];

export const UpgradeModal = ({ open, onClose }) => {
  const [selected, setSelected] = useState("monthly");
  const [phone, setPhone] = useState("");
  const [hiringCount, setHiringCount] = useState("1-10");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const submit = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await api.post("/recruiters/subscription", {
        plan_type: selected,
        phone,
        hiring_count: hiringCount,
      });
      toast.pushToast("Request received! We'll contact you within 24 hours.", "success");
      onClose();
    } catch (error) {
      toast.pushToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8">
      <div className="mx-auto w-full max-w-2xl rounded-[32px] border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-amber-300">Upgrade</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Choose a plan</h2>
          </div>
          <button onClick={onClose} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
            Close
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <button
              key={plan.type}
              type="button"
              onClick={() => setSelected(plan.type)}
              className={`rounded-3xl border p-5 text-left transition-all ${
                selected === plan.type
                  ? "border-amber-300 bg-amber-50 text-slate-950 shadow-xl"
                  : "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500"
              }`}
            >
              <p className="text-lg font-semibold">{plan.label}</p>
              <p className="mt-2 text-3xl font-bold text-white">{plan.price}</p>
              <p className="mt-3 text-sm text-slate-300">{plan.description}</p>
            </button>
          ))}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-300">
            Phone
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400"
              placeholder="Enter phone"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            Hiring count
            <select
              value={hiringCount}
              onChange={(event) => setHiringCount(event.target.value)}
              className="w-full rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400"
            >
              <option>1-10</option>
              <option>11-25</option>
              <option>26-50</option>
              <option>50+</option>
            </select>
          </label>
        </div>
        <button
          disabled={loading}
          onClick={submit}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Submitting..." : "Request contact"}
        </button>
      </div>
    </div>
  );
};
