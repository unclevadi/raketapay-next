"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { JivoResponsive } from "./JivoResponsive";

function teardownJivoDom() {
  if (typeof document === "undefined") return;
  try {
    window.jivo_api?.close?.();
  } catch {
    /* ignore */
  }
  document.querySelectorAll("script[src*='jivo']").forEach((el) => el.remove());
  document.querySelectorAll("iframe[src*='jivo'], iframe[src*='jivosite']").forEach((el) =>
    el.remove()
  );
  for (const id of ["jivo-iframe-container", "jivo_custom_widget", "jivo-frame"] as const) {
    document.getElementById(id)?.remove();
  }
}

/** Виджет Jivo на публичном сайте; на маршрутах `/crm/*` не монтируется и снимается с DOM при переходе. */
export function JivoSiteOnly() {
  const pathname = usePathname();
  const hideOnCrm = pathname?.startsWith("/crm") ?? false;

  useEffect(() => {
    if (!hideOnCrm) return;
    const id = requestAnimationFrame(() => teardownJivoDom());
    return () => cancelAnimationFrame(id);
  }, [hideOnCrm]);

  if (hideOnCrm) return null;
  return <JivoResponsive />;
}
