import type { PhaseBoundary } from "@/lib/domain/platform";

export function PhaseCard({ phase }: { phase: PhaseBoundary }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.24)] backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">{phase.id}</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{phase.name}</h3>
        </div>
        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
          {phase.gate}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">{phase.summary}</p>
      <div className="mt-5">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Definition of done</p>
        <p className="mt-2 text-sm leading-6 text-slate-200">{phase.definitionOfDone}</p>
      </div>
      <div className="mt-5">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Deferred concerns</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">{phase.deferredConcerns.join(", ")}</p>
      </div>
    </article>
  );
}
