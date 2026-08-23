export const PROGRAMME_ADMIN_ENTRA_GROUP_NAME = "SG-Fabric-ProjectIndex-Admins";
export const PROGRAMME_ADMIN_ENTRA_GROUP_OBJECT_ID = "536a4748-19f0-48de-85e7-744e11d0cdb2";

/**
 * Entra is the authoritative organizational source for Programme Admin access.
 * app_user_role is the current application-side authorization projection.
 * Direct group-claim enforcement should replace this projection when Fabric
 * Apps exposes a supported trusted group/app-role claim path.
 */
export function normalizeProgrammeAdminEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!normalized) throw new Error("Bootstrap Admin email is required.");
  return normalized;
}
