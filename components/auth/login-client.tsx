"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/locale-provider";

type TenantOption = { id: string; name: string };

export function LoginClient() {
  const router = useRouter();
  const { t } = useI18n();
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
            : t("login.failed"),
        );
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("login.unavailable"));
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!identifier.trim() || !password) {
      setError(t("login.required"));
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
            {t("login.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
                    <Label htmlFor="login-employee-id">{t("login.employeeId")}</Label>
                    <Input
                      id="login-employee-id"
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      placeholder={t("login.employeeIdPlaceholder")}
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password">{t("login.password")}</Label>
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
                <Label htmlFor="login-tenant">{t("login.school")}</Label>
                <select
                  id="login-tenant"
                  value={tenantId}
                  onChange={(event) => setTenantId(event.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  required
                >
                  <option value="">{t("login.selectSchool")}</option>
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
              {pending ? t("login.signingIn") : tenants.length > 0 ? t("login.continue") : t("login.signIn")}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {t("login.noSignup")}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
