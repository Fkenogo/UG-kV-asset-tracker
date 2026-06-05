import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Zap } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Sign in — kVAssetTracker" },
      { name: "description", content: "Sign in to the UEDCL Transformer Management Platform." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  // If session arrives mid-page, leave.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign-in failed";
      // Friendly mapping
      if (/invalid/i.test(msg)) setError("Invalid email or password.");
      else if (/email/i.test(msg) && /confirm/i.test(msg))
        setError("Please confirm your email address before signing in.");
      else setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center gap-2 text-primary mb-3">
            <div className="grid place-items-center size-11 rounded-lg bg-primary text-primary-foreground">
              <Zap className="size-6" />
            </div>
            <span className="text-2xl font-semibold tracking-tight">
              kV<span className="text-accent">Asset</span>Tracker
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            UEDCL Transformer Management Platform
          </p>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <h1 className="text-lg font-semibold mb-1">
            {mode === "signin" ? "Sign in to your account" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "signin"
              ? "Use your UEDCL-issued email and password."
              : "Sign-ups in production are created by a Super Admin. This option is for initial setup."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@uedcl.co.ug"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="text-sm rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-3 py-2"
              >
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="mt-4 text-xs text-muted-foreground text-center">
            {mode === "signin" ? (
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="underline hover:text-foreground"
              >
                Initial setup? Create the first account
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="underline hover:text-foreground"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Accounts are normally provisioned by a Super Admin. Contact your administrator if you
          don't have access.
        </p>
      </div>
    </div>
  );
}
