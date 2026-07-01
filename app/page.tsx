import { PhaseCard } from "@/components/phase-card";
import { StackList } from "@/components/stack-list";
import { phaseBoundaries } from "@/lib/domain/platform";

const trackedAreas = [
  "Next.js App Router foundation with API handlers under app/api",
  "Prisma schema and first migration for users, coins, contests, rosters, snapshots, results, and transactions",
  "Shared environment parsing, domain constants, validation schemas, and HTTP error primitives",
  "Reserved contracts and test directories to keep Phase 0 work separated from later escrow implementation",
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-10 sm:px-10 lg:px-12">
      <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(124,156,255,0.14),rgba(53,224,161,0.08))] p-8 shadow-[0_32px_120px_rgba(0,0,0,0.32)] backdrop-blur md:p-12">
        <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/80">CryptoFantasy</p>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
          <div>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
              Phase-disciplined platform baseline for a fantasy crypto contest product.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 md:text-lg">
              Tasks 1 and 2 are implemented as a production-ready starting point: the app is live in Next.js,
              the platform entities are modeled in PostgreSQL, and shared contracts for API, jobs, and UI are
              established before gameplay features land.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Included now</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
              {trackedAreas.map((item) => (
                <li key={item} className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Task 1</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Delivery boundaries and stack</h2>
          </div>
        </div>
        <StackList />
      </section>

      <section className="mt-10">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Phases</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Explicit release gates</h2>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {phaseBoundaries.map((phase) => (
            <PhaseCard key={phase.id} phase={phase} />
          ))}
        </div>
      </section>
    </main>
  );
}
