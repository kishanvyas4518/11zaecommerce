import Link from "next/link";
import { ArrowRight, Activity, Zap, Shield } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050906] text-zinc-100 flex flex-col justify-center relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[600px] opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-700 blur-[130px] rounded-full mix-blend-screen" />
      </div>

      <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>

      <main className="max-w-7xl mx-auto px-6 pt-32 pb-16 relative z-10 w-full flex flex-col items-center">
        <div className="text-center max-w-4xl mx-auto space-y-10">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-green-500/10 border border-green-500/20 text-sm font-medium text-green-400 backdrop-blur-md shadow-[0_0_15px_rgba(34,197,94,0.15)]">
            <span className="flex h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-pulse"></span>
            Real-time webhook tracking is now live
          </div>
          
          <h1 className="text-6xl md:text-8xl font-medium tracking-tight text-white leading-[1.1]">
            Unlock your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-teal-400 font-bold drop-shadow-lg">
              commerce data
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-zinc-400/90 max-w-2xl mx-auto font-light leading-relaxed">
            Explode your conversion rates. Track customer activity instantly over our high-performance webhook API tailored for independent brands.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
            <Link
              href="/register"
              className="px-8 py-4 rounded-xl bg-green-500 text-[#050906] font-bold text-lg hover:bg-green-400 hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-all flex items-center gap-2"
            >
              Start Building <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 rounded-xl glass-card text-white font-semibold text-lg hover:bg-white/10 transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-40 max-w-5xl mx-auto w-full">
          <div className="glass-card p-8 group hover:border-green-500/30 transition-colors">
            <div className="h-14 w-14 rounded-xl bg-green-500/10 flex items-center justify-center mb-6 border border-green-500/20 shadow-[inset_0_0_15px_rgba(34,197,94,0.1)] group-hover:bg-green-500/20 transition-colors">
              <Zap className="h-7 w-7 text-green-400" />
            </div>
            <h3 className="text-2xl font-semibold mb-4 text-zinc-100">Blazing Speed</h3>
            <p className="text-zinc-400 leading-relaxed font-light">
              Watch events populate instantly via PostgreSQL & Supabase Realtime without refreshing your browser.
            </p>
          </div>
          <div className="glass-card p-8 group hover:border-green-500/30 transition-colors">
            <div className="h-14 w-14 rounded-xl bg-teal-500/10 flex items-center justify-center mb-6 border border-teal-500/20 shadow-[inset_0_0_15px_rgba(20,184,166,0.1)] group-hover:bg-teal-500/20 transition-colors">
              <Activity className="h-7 w-7 text-teal-400" />
            </div>
            <h3 className="text-2xl font-semibold mb-4 text-zinc-100">$80 Billion+ Scale</h3>
            <p className="text-zinc-400 leading-relaxed font-light">
              Our decoupled Node.js ingested API seamlessly handles massive volumes of webhook traffic from Shopify.
            </p>
          </div>
          <div className="glass-card p-8 group hover:border-green-500/30 transition-colors">
            <div className="h-14 w-14 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20 shadow-[inset_0_0_15px_rgba(16,185,129,0.1)] group-hover:bg-emerald-500/20 transition-colors">
              <Shield className="h-7 w-7 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-semibold mb-4 text-zinc-100">Data Isolation</h3>
            <p className="text-zinc-400 leading-relaxed font-light">
              Every tracked event and customer is safely isolated to your account using advanced Row Level Security.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
