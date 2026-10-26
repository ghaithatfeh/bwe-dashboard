/** Supabase stores phones without the leading "+". */
export const formatPhone = (phone: string | null | undefined) =>
  phone ? (phone.startsWith("+") ? phone : `+${phone}`) : "";
