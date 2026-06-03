export default function RMDashboard() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 text-blue-400 mb-4 border border-blue-500/20 text-2xl">
          🤝
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">RM Dashboard</h1>
        <p className="text-slate-400 text-sm mb-6">
          Welcome to the Relationship Manager portal. Manage client portfolios, tracker assignments, and follow-ups.
        </p>
        <div className="text-xs text-blue-400/80 font-mono bg-blue-500/5 py-2 px-4 rounded-lg border border-blue-500/10">
          RM Session Active
        </div>
      </div>
    </div>
  );
}
