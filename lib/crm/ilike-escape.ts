/** Dlja PostgREST ilike: \\, %, _ — specialnye simvoly. */
export function escapeIlikePattern(raw: string) {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
