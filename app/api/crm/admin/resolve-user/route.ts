import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { data: staff } = await supabase
    .from("crm_staff")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!staff?.is_admin) {
    return NextResponse.json({ error: "Нет прав" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const email =
    typeof body === "object" &&
    body !== null &&
    "email" in body &&
    typeof (body as { email: unknown }).email === "string"
      ? (body as { email: string }).email.trim().toLowerCase()
      : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Укажите email" }, { status: 400 });
  }

  let admin;
  try {
    admin = supabaseAdmin();
  } catch {
    return NextResponse.json({ error: "Сервер не настроен (SUPABASE_URL / service role)" }, { status: 500 });
  }

  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  const found = data.users.find((u) => u.email?.toLowerCase() === email);
  if (!found) {
    return NextResponse.json(
      { error: "Пользователь с таким email не найден в Auth (нужна регистрация)" },
      { status: 404 }
    );
  }

  return NextResponse.json({ user_id: found.id });
}
