export const ADMIN_EMAILS = new Set<string>([
  'stephanieshelbig@gmail.com', // you can add more if needed
]);

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.toLowerCase());
}
