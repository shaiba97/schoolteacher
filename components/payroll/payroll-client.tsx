"use client";

import * as React from "react";
import { BanknoteIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyPayroll } from "@/lib/api/teachers";
import { ApiError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/locale-provider";
import type { TeacherPayout } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof ApiError ? cause.message : fallback;
}

function money(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-u-nu-latn" : "en-GB", {
    style: "currency",
    currency: currency || "SDG",
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Backend payout statuses are lowercased by mapPayout: paid | approved | draft. */
const STATUS_KEY: Record<string, MessageKey> = {
  paid: "payroll.statusPaid",
  approved: "payroll.statusApproved",
  draft: "payroll.statusDraft",
};

const STATUS_VARIANT: Record<string, "success" | "secondary" | "muted"> = {
  paid: "success",
  approved: "secondary",
  draft: "muted",
};

export function PayrollClient() {
  const { t, locale } = useI18n();
  const [data, setData] = React.useState<Awaited<ReturnType<typeof getMyPayroll>> | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(() => {
    getMyPayroll().then(
      (res) => {
        setData(res);
        setError("");
        setLoading(false);
      },
      (cause: unknown) => {
        setError(errorMessage(cause, t("payroll.loadError")));
        setLoading(false);
      },
    );
    // t is stable per locale; fetching once per mount is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function handleRetry() {
    setLoading(true);
    load();
  }

  if (loading && !data) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">{t("payroll.title")}</h1>
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry} disabled={loading}>
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;
  const currency = data.ytd.currencyCode || data.payouts[0]?.currencyCode || "SDG";

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("payroll.subtitle")}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{t("payroll.title")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("payroll.ytd", { year: data.ytd.year })}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("payroll.paid")}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-700">{money(data.ytd.paidTotal, currency, locale)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("payroll.pending")}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{money(data.ytd.pendingTotal, currency, locale)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BanknoteIcon size={16} aria-hidden /> {t("payroll.payslips")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.payouts.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t("payroll.noPayouts")}</p>
          ) : (
            <ul className="space-y-3">
              {data.payouts.map((payout) => (
                <PayoutRow key={payout.id} payout={payout} currency={currency} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function PayoutRow({ payout, currency }: { payout: TeacherPayout; currency: string }) {
  const { t, locale } = useI18n();
  return (
    <li className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="min-w-0 flex-1 truncate text-sm font-medium" title={payout.periodName}>
          {payout.periodName || t("payroll.periodRange", { start: formatDate(payout.periodStart, locale), end: formatDate(payout.periodEnd, locale) })}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">{payout.payslipNo}</span>
        <Badge variant={STATUS_VARIANT[payout.status] ?? "muted"}>
          {t(STATUS_KEY[payout.status] ?? "payroll.statusDraft")}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {payout.positionTitle ? `${payout.positionTitle} · ` : ""}
        {t("payroll.periodRange", { start: formatDate(payout.periodStart, locale), end: formatDate(payout.periodEnd, locale) })}
        {" · "}
        {payout.status === "paid" && payout.paidAt
          ? t("payroll.paidOn", { date: formatDate(payout.paidAt, locale) })
          : t("payroll.pendingNote")}
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("payroll.gross")}</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums">{money(payout.grossAmount, currency, locale)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("payroll.deductions")}</p>
          <p className={`mt-0.5 text-sm font-semibold tabular-nums ${payout.totalDeductions > 0 ? "text-destructive" : ""}`}>
            −{money(payout.totalDeductions, currency, locale)}
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("payroll.net")}</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-700">{money(payout.netAmount, currency, locale)}</p>
        </div>
      </div>
      {payout.deductions.length > 0 && (
        <ul className="mt-2 space-y-1">
          {payout.deductions.map((deduction) => (
            <li key={deduction.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span className="min-w-0 flex-1 truncate">{deduction.label}{deduction.note ? ` — ${deduction.note}` : ""}</span>
              <span className="tabular-nums">−{money(deduction.amount, currency, locale)}</span>
            </li>
          ))}
        </ul>
      )}
      {payout.deductions.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">{t("payroll.noDeductions")}</p>
      )}
      {payout.reference && (
        <p className="mt-2 text-xs text-muted-foreground">
          {payout.paymentMethod ? `${payout.paymentMethod} · ` : ""}{payout.reference}
        </p>
      )}
    </li>
  );
}
