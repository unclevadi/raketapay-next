export type CrmStaffAccess = {
  can_access_retail: boolean;
  can_access_b2b: boolean;
  is_admin: boolean;
  /** Roznica uspeh/otkaz i B2B zakrytie uspehom (admin vsegda mozhet). */
  can_confirm_success: boolean;
};

export function canCloseDealSuccess(staff: CrmStaffAccess | null) {
  if (!staff) return false;
  return Boolean(staff.is_admin || staff.can_confirm_success);
}
