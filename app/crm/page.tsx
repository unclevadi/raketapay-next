import { CrmHomeClient } from "./CrmHomeClient";
import { CrmPageShell } from "./CrmPageShell";

export default function CrmHomePage() {
  return (
    <CrmPageShell
      title="Обзор"
      description="Розница и B2B разделены по правам; курсы правит только админ. Данные в Supabase."
      variant="xl"
    >
      <CrmHomeClient />
    </CrmPageShell>
  );
}
