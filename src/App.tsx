export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            Calendar MD
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Weekly schedule from Markdown
          </h1>
          <p className="max-w-2xl text-slate-300">
            Upload a week file to populate the Monday to Sunday grid, edit events, then
            save back to the same .md file.
          </p>
        </header>

        <main className="mt-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                  Selected week
                </p>
                <p className="text-lg font-semibold text-white">None loaded yet</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500">
                  Upload .md
                </button>
                <button className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400">
                  Save week
                </button>
              </div>
            </div>
          </div>

          <section className="mt-8 grid gap-4 lg:grid-cols-7">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4"
              >
                <div className="flex items-baseline justify-between">
                  <h2 className="text-sm font-semibold text-white">{label}</h2>
                  <span className="text-xs text-slate-500">00000000</span>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="rounded-xl border border-dashed border-slate-800 px-3 py-2 text-xs text-slate-500">
                    No events yet
                  </div>
                </div>
              </div>
            ))}
          </section>
        </main>
      </div>
    </div>
  )
}
