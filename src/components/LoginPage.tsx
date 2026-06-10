import React, { useState } from "react";
import { Lock, Mail, ShieldAlert, Fingerprint } from "lucide-react";

interface LoginPageProps {
  onLogin: (email: string, pass: string) => boolean;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    const success = onLogin(email.trim().toLowerCase(), password);
    if (!success) {
      setErrorMsg("Invalid credentials or account deactivated. Contact Super Admin.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[32px] border border-slate-100 p-8 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.06)] flex flex-col justify-between space-y-8 animate-in zoom-in-95 duration-250">
        
        {/* Branding header */}
        <div className="text-center space-y-3.5">
          <div className="inline-flex p-3.5 bg-indigo-600 rounded-[24px] text-white shadow-lg shadow-indigo-600/20">
            <Fingerprint className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-sans">Sewadar Management System</h1>
            <p className="text-xs font-bold text-indigo-600 font-mono tracking-widest uppercase mt-1">SMS Registry Vault</p>
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Selfless Devotion Tracker • Central Security Control Room
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-semibold text-slate-650">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl flex items-center gap-2 font-bold animate-shake">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Username / Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-150 rounded-xl outline-none focus:bg-white focus:border-indigo-505 transition-all font-bold text-slate-800 text-xs"
                placeholder="developer@sms.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest">Account Password</label>
              <span className="text-[10px] font-mono text-indigo-500 hover:underline cursor-pointer">Security Key</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-150 rounded-xl outline-none focus:bg-white focus:border-indigo-505 transition-all text-xs"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl shadow-md shadow-indigo-600/10 active:scale-[0.99] hover:scale-[1.01] transition-all pt-3.5"
          >
            Access Core Workspace
          </button>
        </form>

        {/* Demo Seed guidelines */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
          <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest">Seeded Operator Profiles for Review</p>
          <div className="grid grid-cols-1 gap-1.5 text-[10px] text-slate-500">
            <div className="flex justify-between border-b border-dashed pb-1">
              <span>⚡ Super Admin Account:</span>
              <span className="font-mono font-bold text-slate-700">admin@sms.org / admin123</span>
            </div>
            <div className="flex justify-between border-b border-dashed pb-1">
              <span>⚙️ Lead Executive Account:</span>
              <span className="font-mono font-bold text-slate-700">lead@sms.org / lead123</span>
            </div>
            <div className="flex justify-between">
              <span>👁️ Read-Only Viewer Account:</span>
              <span className="font-mono font-bold text-slate-700">viewer@sms.org / view123</span>
            </div>
          </div>
          <span className="text-[9px] text-slate-400 block pt-1 leading-normal font-medium">
            * Fully integrated with RBAC. Accessing directories, audit histories, or making modifications instantly applies role parameters.
          </span>
        </div>

      </div>
    </div>
  );
}
