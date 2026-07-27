import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import { ApiError } from "../api/client";
import { landingPathForRole } from "../lib/roleLanding";
import Spinner from "../components/common/Spinner";

const DEMO_CREDENTIALS = [
  { role: "Administrator", email: "admin@vms.local", password: "Admin@123" },
  { role: "Operator", email: "operator@vms.local", password: "Operator@123" },
  { role: "Viewer", email: "viewer1@vms.local", password: "Viewer@123" },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await login(email, password);
      setSession(data.accessToken, data.user);
      navigate(landingPathForRole(data.user.role), { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401 ? "Invalid email or password." : err.message);
      } else {
        setError("Unable to reach the server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(demoEmail: string, demoPassword: string) {
    setEmail(demoEmail);
    setPassword(demoPassword);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-lg font-bold text-surface-950">
            V
          </div>
          <h1 className="text-xl font-semibold text-surface-50">VMS Operations Console</h1>
          <p className="text-sm text-surface-400">Sign in to monitor and manage your camera network.</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@vms.local"
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger-soft">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-2">
            {loading && <Spinner size={14} />}
            Sign In
          </button>
        </form>

        <div className="mt-4 rounded-lg border border-surface-800 bg-surface-900/60 p-4 text-xs text-surface-400">
          <p className="mb-2 font-semibold uppercase tracking-wide text-surface-300">Demo credentials</p>
          <ul className="space-y-1.5">
            {DEMO_CREDENTIALS.map((c) => (
              <li key={c.email} className="flex items-center justify-between gap-2">
                <span>
                  <span className="text-surface-300">{c.role}:</span> {c.email} / {c.password}
                </span>
                <button
                  type="button"
                  onClick={() => fillDemo(c.email, c.password)}
                  className="shrink-0 rounded border border-surface-700 px-2 py-0.5 text-[11px] text-surface-300 hover:bg-surface-800"
                >
                  Use
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
