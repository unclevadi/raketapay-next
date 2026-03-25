/**
 * Feature flag for MAX messenger UI.
 * - When false, MAX is hidden everywhere (default).
 * - When true, UI can show MAX buttons/labels.
 */
export const MAX_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MAX === "true";

