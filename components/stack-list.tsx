import { stackDecisions } from "@/lib/domain/platform";

export function StackList() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {stackDecisions.map((item) => (
        <article key={item.label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
          <h3 className="mt-2 text-base font-semibold text-white">{item.value}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">{item.reason}</p>
        </article>
      ))}
    </div>
  );
}
