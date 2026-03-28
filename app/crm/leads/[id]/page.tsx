"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { logCrmAudit } from "@/lib/crm/audit";
import {
  CRM_LEAD_INTENDED_LABELS,
  CRM_LEAD_STATUS_LABELS,
} from "@/lib/crm/lead-meta";
import {
  crmBtnDanger,
  crmBtnSecondary,
  crmCard,
  crmErrorBanner,
  crmLabel,
  crmSectionTitle,
  crmSelect,
  crmTextarea,
} from "@/lib/crm/crm-ui";
import { fetchCrmStaffOptions, type CrmStaffOption } from "@/lib/crm/staff-directory";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { CrmPageShell } from "../../CrmPageShell";
import { CrmPageHeaderSkeleton } from "../../CrmSkeletons";

type Lead = {
  id: string;
  status: string;
  source: string | null;
  campaign: string | null;
  contact_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  contact_telegram: string | null;
  company_name: string | null;
  message: string | null;
  internal_notes: string | null;
  intended_segment: string | null;
  assigned_to: string | null;
  converted_retail_deal_id: string | null;
  converted_b2b_deal_id: string | null;
  created_at: string;
};

const STATUSES = Object.keys(CRM_LEAD_STATUS_LABELS) as (keyof typeof CRM_LEAD_STATUS_LABELS)[];

export default function CrmLeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [staffOptions, setStaffOptions] = useState<CrmStaffOption[]>([]);

  useEffect(() => {
    let c = false;
    void (async () => {
      const supabase = supabaseBrowser();
      const r = await fetchCrmStaffOptions(supabase);
      if (!c && !r.error) setStaffOptions(r.options);
    })();
    return () => {
      c = true;
    };
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const supabase = supabaseBrowser();
    const { data, error } = await supabase.from("crm_leads").select("*").eq("id", id).maybeSingle();
    if (error) {
      setMsg(error.message);
      setLead(null);
    } else {
      const r = data as Record<string, unknown> | null;
      setLead(
        r
          ? ({
              ...(data as Lead),
              intended_segment: (r.intended_segment as string | null | undefined) ?? null,
              assigned_to: (r.assigned_to as string | null | undefined) ?? null,
            } as Lead)
          : null
      );
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchStatus(status: string) {
    if (!lead) return;
    const prev = lead.status;
    setBusy(true);
    setMsg(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("crm_leads").update({ status }).eq("id", lead.id);
    setBusy(false);
    if (error) setMsg(error.message);
    else {
      setLead({ ...lead, status });
      await logCrmAudit(supabase, {
        event_type: "lead_status_changed",
        entity_table: "crm_leads",
        entity_id: lead.id,
        summary: `Статус заявки: ${prev} → ${status}`,
        meta: { from: prev, to: status },
      });
    }
  }

  async function patchNotes(internal_notes: string) {
    if (!lead) return;
    setBusy(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("crm_leads").update({ internal_notes }).eq("id", lead.id);
    setBusy(false);
    if (error) setMsg(error.message);
    else setLead({ ...lead, internal_notes });
  }

  async function patchAssigned(assigned_to: string) {
    if (!lead) return;
    setBusy(true);
    const supabase = supabaseBrowser();
    const v = assigned_to.trim() || null;
    const { error } = await supabase.from("crm_leads").update({ assigned_to: v }).eq("id", lead.id);
    setBusy(false);
    if (error) setMsg(error.message);
    else setLead({ ...lead, assigned_to: v });
  }

  async function convertRetail() {
    if (!lead || lead.converted_retail_deal_id) return;
    setBusy(true);
    setMsg(null);
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const line = (lead.message?.trim() || "Заявка из CRM").slice(0, 800);
    const assign = lead.assigned_to;
    const { data: ins, error } = await supabase
      .from("crm_deals")
      .insert({
        client_name: lead.contact_name.trim(),
        contact_telegram: lead.contact_telegram?.trim() || null,
        contact_email: lead.contact_email?.trim() || null,
        contact_phone: lead.contact_phone?.trim() || null,
        service_id: null,
        custom_line_description: line,
        client_amount: 0.01,
        client_currency: "RUB",
        payment_method: "other",
        paid_at: new Date().toISOString(),
        deal_outcome: "open",
        created_by: user?.id ?? null,
        assigned_to: assign,
      })
      .select("id")
      .single();
    if (error) {
      setMsg(error.message);
      setBusy(false);
      return;
    }
    const dealId = ins?.id as string;
    const { error: u2 } = await supabase
      .from("crm_leads")
      .update({
        status: "converted",
        converted_retail_deal_id: dealId,
      })
      .eq("id", lead.id);
    setBusy(false);
    if (u2) setMsg(u2.message);
    else {
      await logCrmAudit(supabase, {
        event_type: "lead_converted_retail",
        entity_table: "crm_leads",
        entity_id: lead.id,
        summary: "Заявка → сделка физлица",
        meta: { retail_deal_id: dealId },
      });
      router.push(`/crm/deals`);
    }
  }

  async function convertB2b() {
    if (!lead || lead.converted_b2b_deal_id) return;
    setBusy(true);
    setMsg(null);
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: st } = await supabase
      .from("crm_b2b_pipeline_stages")
      .select("id")
      .eq("slug", "inquiry")
      .maybeSingle();
    if (!st?.id) {
      setMsg("Нет этапа inquiry в справочнике B2B.");
      setBusy(false);
      return;
    }
    const company = (lead.company_name?.trim() || lead.contact_name.trim()).slice(0, 240);
    const assign = lead.assigned_to;
    const { data: ins, error } = await supabase
      .from("crm_b2b_deals")
      .insert({
        company_legal_name: company,
        country_code: "RU",
        transfer_amount: 1,
        transfer_currency: "USD",
        purpose_summary: lead.message?.trim()?.slice(0, 500) || null,
        stage_id: st.id,
        deal_tier: "tier_m",
        priority: 2,
        contact_name: lead.contact_name.trim(),
        contact_email: lead.contact_email?.trim() || null,
        contact_phone: lead.contact_phone?.trim() || null,
        internal_notes: lead.internal_notes?.trim() || null,
        created_by: user?.id ?? null,
        assigned_to: assign,
      })
      .select("id")
      .single();
    if (error) {
      setMsg(error.message);
      setBusy(false);
      return;
    }
    const b2bId = ins?.id as string;
    const { error: u2 } = await supabase
      .from("crm_leads")
      .update({
        status: "converted",
        converted_b2b_deal_id: b2bId,
      })
      .eq("id", lead.id);
    setBusy(false);
    if (u2) setMsg(u2.message);
    else {
      await logCrmAudit(supabase, {
        event_type: "lead_converted_b2b",
        entity_table: "crm_leads",
        entity_id: lead.id,
        summary: "Заявка → сделка юрлица",
        meta: { b2b_deal_id: b2bId },
      });
      router.push(`/crm/b2b/${b2bId}`);
    }
  }

  async function convertByIntent() {
    if (!lead?.intended_segment) return;
    if (lead.intended_segment === "retail") await convertRetail();
    else if (lead.intended_segment === "b2b") await convertB2b();
  }

  if (loading) {
    return (
      <CrmPageShell title="Заявка" variant="narrow">
        <CrmPageHeaderSkeleton />
      </CrmPageShell>
    );
  }

  if (!lead) {
    return (
      <CrmPageShell
        title="Заявка"
        variant="narrow"
        prepend={
          <Link
            href="/crm/leads"
            className="text-[11px] uppercase tracking-widest text-tech-cyan/88 transition-colors duration-200 hover:text-tech-cyan"
          >
            ← Заявки
          </Link>
        }
      >
        <div className={crmErrorBanner}>{msg ?? "Не найдено"}</div>
      </CrmPageShell>
    );
  }

  const converted = Boolean(lead.converted_retail_deal_id || lead.converted_b2b_deal_id);
  const intentLabel = lead.intended_segment
    ? CRM_LEAD_INTENDED_LABELS[lead.intended_segment] ?? lead.intended_segment
    : null;

  return (
    <CrmPageShell
      title={lead.contact_name}
      description={
        <>
          {new Date(lead.created_at).toLocaleString("ru-RU")}
          {lead.source ? ` · ${lead.source}` : ""}
          {lead.campaign ? ` · ${lead.campaign}` : ""}
        </>
      }
      titleAddon={
        intentLabel ? (
          <span
            className={`rounded-md px-2 py-0.5 font-header text-[9px] uppercase tracking-wide ${
              lead.intended_segment === "b2b"
                ? "bg-violet-500/22 text-violet-200/92"
                : "bg-soviet-red/22 text-red-200/92"
            }`}
          >
            {intentLabel}
          </span>
        ) : null
      }
      prepend={
        <Link
          href="/crm/leads"
          className="text-[11px] uppercase tracking-widest text-tech-cyan/88 transition-colors duration-200 hover:text-tech-cyan"
        >
          ← Заявки
        </Link>
      }
      variant="narrow"
    >
      {msg ? <div className={`mb-6 ${crmErrorBanner}`}>{msg}</div> : null}

      {!converted ? (
        <label className="mb-6 block space-y-1">
          <span className={crmLabel}>Менеджер на сделке</span>
          <select
            value={lead.assigned_to ?? ""}
            disabled={busy}
            onChange={(e) => void patchAssigned(e.target.value)}
            className={`${crmSelect} max-w-md`}
          >
            <option value="">Не назначен</option>
            {staffOptions.map((s) => (
              <option key={s.user_id} value={s.user_id}>
                {s.email ?? s.user_id.slice(0, 8) + "…"}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <section className={`${crmCard} space-y-3 text-[13px]`}>
        <div>
          <span className="text-[10px] uppercase tracking-wide text-soviet-cream/42">Телефон</span>
          <p className="text-soviet-cream/85">{lead.contact_phone ?? "—"}</p>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wide text-soviet-cream/42">Email</span>
          <p className="text-soviet-cream/85">{lead.contact_email ?? "—"}</p>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wide text-soviet-cream/42">Telegram</span>
          <p className="text-soviet-cream/85">{lead.contact_telegram ?? "—"}</p>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wide text-soviet-cream/42">Компания</span>
          <p className="text-soviet-cream/85">{lead.company_name ?? "—"}</p>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wide text-soviet-cream/42">Сообщение</span>
          <p className="whitespace-pre-wrap text-soviet-cream/75">{lead.message ?? "—"}</p>
        </div>
      </section>

      <label className="mt-6 block space-y-2">
        <span className={crmLabel}>Внутренние заметки</span>
        <textarea
          defaultValue={lead.internal_notes ?? ""}
          disabled={busy}
          id="notes"
          rows={3}
          className={crmTextarea}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            const el = document.getElementById("notes") as HTMLTextAreaElement;
            void patchNotes(el.value);
          }}
          className={crmBtnSecondary}
        >
          Сохранить заметки
        </button>
      </label>

      <section className="mt-8">
        <h2 className={crmSectionTitle}>Статус</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={busy || (converted && s !== "converted")}
              onClick={() => void patchStatus(s)}
              className={`rounded-lg border px-3 py-1.5 font-header text-[10px] uppercase tracking-wide transition-colors duration-200 disabled:opacity-35 ${
                lead.status === s
                  ? "border-sky-500/50 bg-sky-950/40 text-sky-200"
                  : "border-white/15 text-soviet-cream/70 hover:bg-white/[0.06]"
              }`}
            >
              {CRM_LEAD_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </section>

      {!converted ? (
        <section className="mt-10 rounded-2xl border border-violet-500/28 bg-violet-950/12 p-5 shadow-sm transition-[border-color] duration-200">
          <h2 className="font-header text-xs uppercase tracking-[0.2em] text-violet-300/92">
            Конвертация
          </h2>
          <p className="mt-2 text-[12px] text-soviet-cream/55">
            Черновик сделки; сумму и реквизиты уточните в карточке. Менеджер подтянется из поля выше.
          </p>
          {lead.intended_segment === "retail" || lead.intended_segment === "b2b" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void convertByIntent()}
              className="mt-4 w-full rounded-lg bg-gradient-to-r from-sky-600 to-violet-600 px-4 py-3 font-header text-[11px] uppercase tracking-widest text-white hover:opacity-95 disabled:opacity-50 sm:w-auto"
            >
              {lead.intended_segment === "retail"
                ? "Создать сделку физлица и перейти"
                : "Создать B2B и перейти"}
            </button>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3 border-t border-white/10 pt-4">
            <span className="w-full text-[10px] uppercase text-soviet-cream/40">
              Или вручную
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void convertRetail()}
              className={crmBtnDanger}
            >
              В сделку физлица
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void convertB2b()}
              className="rounded-lg bg-violet-600 px-4 py-2.5 font-header text-[10px] uppercase tracking-widest text-white shadow-sm transition-all duration-200 hover:bg-violet-500 disabled:opacity-50"
            >
              В сделку юрлица
            </button>
          </div>
        </section>
      ) : (
        <p className="mt-8 text-sm text-soviet-cream/55">
          Заявка переведена в сделку.
          {lead.converted_retail_deal_id ? (
            <>
              {" "}
              <Link href="/crm/deals" className="text-tech-cyan/90 underline">
                Журнал физлиц
              </Link>
            </>
          ) : null}
          {lead.converted_b2b_deal_id ? (
            <>
              {" "}
              <Link
                href={`/crm/b2b/${lead.converted_b2b_deal_id}`}
                className="text-tech-cyan/90 underline"
              >
                Открыть B2B
              </Link>
            </>
          ) : null}
        </p>
      )}
    </CrmPageShell>
  );
}
