import { Suspense } from "react";
import { CrmLoginForm } from "./CrmLoginForm";

function LoginFallback() {
  return (
    <main className="flex min-h-dvh items-center justify-center font-body text-sm text-soviet-cream/50">
      Загрузка…
    </main>
  );
}

export default function CrmLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <CrmLoginForm />
    </Suspense>
  );
}
