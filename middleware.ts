import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function isRetailPath(path: string) {
  return (
    path === "/crm" ||
    path.startsWith("/crm/rates") ||
    path.startsWith("/crm/price") ||
    path.startsWith("/crm/deals")
  );
}

export async function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/crm")) {
    return NextResponse.next();
  }

  if (process.env.NEXT_PUBLIC_ENABLE_CRM !== "true") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return new NextResponse(
      "CRM: задайте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY",
      { status: 503 }
    );
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request: { headers: request.headers } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const path = request.nextUrl.pathname;
  const isLogin = path === "/crm/login";
  const isDenied = path === "/crm/denied";
  const isDeniedScope = path === "/crm/denied-scope";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isLogin) return response;
    const loginUrl = new URL("/crm/login", request.url);
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  const { data: staffRow, error: staffErr } = await supabase
    .from("crm_staff")
    .select("can_access_retail, can_access_b2b, is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  if (staffErr) {
    return new NextResponse(
      "CRM: выполните миграцию 20260330140000_crm_roles_b2b.sql (колонки прав в crm_staff).",
      { status: 503 }
    );
  }

  if (!staffRow) {
    if (isDenied || isLogin) return response;
    return NextResponse.redirect(new URL("/crm/denied", request.url));
  }

  const retail = Boolean(staffRow.can_access_retail);
  const b2b = Boolean(staffRow.can_access_b2b);
  const admin = Boolean(staffRow.is_admin);
  const b2bOk = b2b || admin;

  if (isDenied) {
    const home = retail ? "/crm" : b2bOk ? "/crm/b2b" : "/crm/denied-scope";
    return NextResponse.redirect(new URL(home, request.url));
  }

  if (isLogin) {
    const dest = retail ? "/crm" : b2bOk ? "/crm/b2b" : "/crm/denied-scope";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (isDeniedScope) {
    return response;
  }

  if (path.startsWith("/crm/admin")) {
    if (!admin) {
      return NextResponse.redirect(new URL("/crm/denied-scope", request.url));
    }
    return response;
  }

  if (path.startsWith("/crm/b2b")) {
    if (!b2bOk) {
      return NextResponse.redirect(new URL("/crm/denied-scope", request.url));
    }
    return response;
  }

  if (path.startsWith("/crm/reports")) {
    if (!retail && !b2bOk) {
      return NextResponse.redirect(new URL("/crm/denied-scope", request.url));
    }
    return response;
  }

  if (
    path.startsWith("/crm/leads") ||
    path.startsWith("/crm/dashboard") ||
    path.startsWith("/crm/search")
  ) {
    if (!retail && !b2bOk) {
      return NextResponse.redirect(new URL("/crm/denied-scope", request.url));
    }
    return response;
  }

  if (isRetailPath(path)) {
    if (!retail) {
      if (b2bOk) {
        return NextResponse.redirect(new URL("/crm/b2b", request.url));
      }
      return NextResponse.redirect(new URL("/crm/denied-scope", request.url));
    }
    return response;
  }

  return response;
}

export const config = {
  matcher: ["/crm", "/crm/:path*"],
};
