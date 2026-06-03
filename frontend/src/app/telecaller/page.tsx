export default function TelecallerDashboard() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 mb-4 border border-emerald-500/20 text-2xl">
          📞
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Telecaller Dashboard</h1>
        <p className="text-slate-400 text-sm mb-6">
          Welcome to the Telecalling portal. Track leads, dial queues, and update customer contact logs.
        </p>
        <div className="text-xs text-emerald-400/80 font-mono bg-emerald-500/5 py-2 px-4 rounded-lg border border-emerald-500/10">
          Agent Online
        </div>
      </div>
    </div>
  );
}
