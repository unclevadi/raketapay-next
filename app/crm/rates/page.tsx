"use client";

import { useCallback, useEffect, useState } from "react";
import { crmBtnDanger, crmCard, crmInput, crmLabel } from "@/lib/crm/crm-ui";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { CrmPageShell } from "../CrmPageShell";
import { CrmPageHeaderSkeleton } from "../CrmSkeletons";
import { useCrmAccess } from "../CrmAccessProvider";

export default function CrmRatesPage() {
  const { staff, loading: accessLoading } = useCrmAccess();
  const isAdmin = Boolean(staff?.is_admin);
  const [uzs, setUzs] = useState("");
  const [rub, setRub] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    const supabase = supabaseBrowser();
    const { data, error } = await supabase
      .from("crm_exchange_rates")
      .select("uzs_per_usd, rub_per_usd, updated_at")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    if (data) {
      setUzs(String(data.uzs_per_usd));
      setRub(String(data.rub_per_usd));
      setUpdatedAt(data.updated_at);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setMessage(null);
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const uzsN = Number(uzs.replace(",", "."));
    const rubN = Number(rub.replace(",", "."));
    if (!Number.isFinite(uzsN) || !Number.isFinite(rubN) || uzsN <= 0 || rubN <= 0) {
      setMessage("Введите положительные числа для курсов.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("crm_exchange_rates")
      .update({
        uzs_per_usd: uzsN,
        rub_per_usd: rubN,
        updated_by: user?.id ?? null,
      })
      .eq("id", 1);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Сохранено.");
      await load();
    }
    setSaving(false);
  }

  return (
    <CrmPageShell
      title="Операционные курсы"
      description={
        <>
          Сколько UZS и RUB за <strong className="text-soviet-cream/85">1 USD</strong>. Прайс в разделе
          «Прайс» пересчитывается от этих значений.
        </>
      }
      variant="sm"
    >
      {!accessLoading && !isAdmin ? (
        <p className="mb-6 rounded-xl border border-amber-500/25 bg-amber-950/28 px-3 py-2.5 text-xs text-amber-200/88">
          Редактирование курсов доступно только администратору; вы можете просматривать значения.
        </p>
      ) : null}

      {loading ? (
        <CrmPageHeaderSkeleton />
      ) : (
        <div className={`${crmCard} space-y-5`}>
          <label className="block space-y-1.5">
            <span className={crmLabel}>UZS за 1 USD</span>
            <input
              type="text"
              inputMode="decimal"
              value={uzs}
              onChange={(e) => setUzs(e.target.value)}
              readOnly={!isAdmin}
              className={`${crmInput} read-only:cursor-default read-only:opacity-80`}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={crmLabel}>RUB за 1 USD</span>
            <input
              type="text"
              inputMode="decimal"
              value={rub}
              onChange={(e) => setRub(e.target.value)}
              readOnly={!isAdmin}
              className={`${crmInput} read-only:cursor-default read-only:opacity-80`}
            />
          </label>

          {updatedAt ? (
            <p className="text-xs text-soviet-cream/45">
              Последнее обновление:{" "}
              {new Date(updatedAt).toLocaleString("ru-RU", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          ) : null}

          {message ? (
            <p
              className={`text-sm ${message === "Сохранено." ? "text-emerald-400/90" : "text-red-400/90"}`}
            >
              {message}
            </p>
          ) : null}

          {isAdmin ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className={`${crmBtnDanger} w-full py-3`}
            >
              {saving ? "Сохранение…" : "Сохранить курсы"}
            </button>
          ) : null}
        </div>
      )}
    </CrmPageShell>
  );
}
