import React, { useState } from "react";
import { Loader2, Boxes, XCircle } from "lucide-react";
import api, { setToken } from "../api";

export default function LoginPage({ onAuthed }) {
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const result = mode === "login"
        ? await api.login({ email, password })
        : await api.signup({ email, password, full_name: fullName });
      setToken(result.access_token);
      onAuthed(result.user);
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  return (
    <div className="w-full min-h-screen bg-[#F5F6FA] flex items-center justify-center p-6" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-6">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shrink-0">
            <Boxes size={18} color="white" />
          </div>
          <div className="text-[16px] font-medium text-gray-900">AI Demand Forecasting</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex rounded-lg bg-gray-100 p-1 mb-5">
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 py-1.5 rounded-md text-[13px] font-medium ${mode === "login" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}
            >
              Log in
            </button>
            <button
              onClick={() => { setMode("signup"); setError(""); }}
              className={`flex-1 py-1.5 rounded-md text-[13px] font-medium ${mode === "signup" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === "signup" && (
              <div>
                <label className="text-[12px] text-gray-500 block mb-1">Full name</label>
                <input required value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px]" />
              </div>
            )}
            <div>
              <label className="text-[12px] text-gray-500 block mb-1">Email</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px]" />
            </div>
            <div>
              <label className="text-[12px] text-gray-500 block mb-1">Password</label>
              <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px]" />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-[12.5px] text-red-700 bg-red-50 border border-red-100 rounded-lg p-2.5">
                <XCircle size={14} className="shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="mt-1 w-full flex items-center justify-center gap-2 bg-indigo-500 text-white rounded-lg px-4 py-2.5 text-[13px] font-medium hover:bg-indigo-600 disabled:opacity-60"
            >
              {status === "loading" && <Loader2 className="animate-spin" size={14} />}
              {mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>

          {mode === "signup" && (
            <div className="text-[11px] text-gray-400 mt-3 text-center">
              First account on this system becomes admin automatically. Everyone after that starts as a viewer.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
