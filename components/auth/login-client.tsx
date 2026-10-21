"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

type TenantOption = { id: string; name: string };

export function LoginClient() {
  const router = useRouter();
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [tenants, setTenants] = React.useState<TenantOption[]>([]);
  const [tenantId, setTenantId] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");

  async function submit(selectedTenantId?: string) {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/session/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          ...(selectedTenantId ? { tenantId: selectedTenantId } : {}),
        }),
      });
      const data = await response.json().catch(() => undefined);
      if (response.status === 409 && data && Array.isArray(data.tenants)) {
        setTenants(data.tenants as TenantOption[]);
        setError("");
        return;
      }
      if (!response.ok) {
        setError(
          typeof data === "object" && data && "message" in data
            ? String((data as { message: unknown }).message)
            : "Sign in failed",
        );
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Teacher portal is unavailable — try again");
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Employee ID and password are required.");
      return;
    }
    void submit(tenantId || undefined);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LogIn size={16} className="text-muted-foreground" aria-hidden />
            Teacher sign in
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
                    <Label htmlFor="login-employee-id">Employee ID</Label>
                    <Input
                      id="login-employee-id"
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      placeholder="26CPM001"
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {tenants.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="login-tenant">School</Label>
                <select
                  id="login-tenant"
                  value={tenantId}
                  onChange={(event) => setTenantId(event.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  required
                >
                  <option value="">Select your school…</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={pending || !identifier.trim() || !password || (tenants.length > 0 && !tenantId)}
            >
              {pending ? "Signing in…" : tenants.length > 0 ? "Continue" : "Sign in"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Accounts are provisioned by academic affairs — there is no self-signup.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
