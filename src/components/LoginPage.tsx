import React, { useState } from "react";
import { Lock, Mail, ShieldAlert, Fingerprint } from "lucide-react";

interface LoginPageProps {
  onLogin: (email: string, pass: string) => Promise<boolean>;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErrorMsg("");
    
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const success = await onLogin(email.trim().toLowerCase(), password);
      if (!success) {
        setErrorMsg("Invalid credentials or account deactivated. Contact Super Admin.");
      }
    } catch (err) {
      setErrorMsg("Unable to connect to login server. Please try again.");
    } finally {
      setLoading(false);
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
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs py-3 rounded-xl shadow-md shadow-indigo-600/10 active:scale-[0.99] hover:scale-[1.01] transition-all pt-3.5 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verifying Credentials on Server...
              </>
            ) : (
              "Access Core Workspace"
            )}
          </button>
        </form>



      </div>
    </div>
  );
}
