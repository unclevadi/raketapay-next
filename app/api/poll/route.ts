import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";

const ALLOWED_CHANNELS = [
  "site",
  "telegram",
  "max",
  "vk",
  "viber",
  "whatsapp",
  "imo",
  "other",
] as const;

type Channel = (typeof ALLOWED_CHANNELS)[number];

function isChannel(v: unknown): v is Channel {
  return typeof v === "string" && (ALLOWED_CHANNELS as readonly string[]).includes(v);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as {
    channel?: unknown;
    clientId?: unknown;
    otherText?: unknown;
    pagePath?: unknown;
    utmSource?: unknown;
    utmMedium?: unknown;
    utmCampaign?: unknown;
  };

  if (!isChannel(b.channel)) {
    return NextResponse.json({ ok: false, error: "Invalid channel" }, { status: 400 });
  }

  const otherText =
    typeof b.otherText === "string" ? b.otherText.trim().slice(0, 80) : null;
  const pagePath = typeof b.pagePath === "string" ? b.pagePath.slice(0, 200) : null;
  const utm_source = typeof b.utmSource === "string" ? b.utmSource.slice(0, 80) : null;
  const utm_medium = typeof b.utmMedium === "string" ? b.utmMedium.slice(0, 80) : null;
  const utm_campaign =
    typeof b.utmCampaign === "string" ? b.utmCampaign.slice(0, 80) : null;

  const client_id =
    typeof b.clientId === "string" ? b.clientId.trim().slice(0, 64) : null;

  const ua = (await headers()).get("user-agent")?.slice(0, 220) ?? null;

  const supabase = supabaseAdmin();
  const { error } = await supabase.from("preferred_channel_votes").insert({
    channel: b.channel,
    client_id,
    other_text: otherText,
    page_path: pagePath,
    utm_source,
    utm_medium,
    utm_campaign,
    user_agent: ua,
  });

  if (error) {
    // If unique index is enabled, treat duplicates as OK (already recorded today).
    if ((error.code ?? "") === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

