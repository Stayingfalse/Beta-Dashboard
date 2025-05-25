// Central debug flag for admin API routes
export const ADMIN_API_DEBUG = true;
export function adminDebugLog(...args: unknown[]): void {
  if (ADMIN_API_DEBUG) console.log('[admin-api]', ...args);
}
