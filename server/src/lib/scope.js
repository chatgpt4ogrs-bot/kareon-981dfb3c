/**
 * Retorna filtro de clínicas do usuário autenticado.
 * - null = todas (só Superadmin sem tenant ativo)
 * - [] = nenhuma
 * - [uuid…] = escopo restrito
 *
 * Cada clínica tem agenda/dados próprios. Tenant ativo (X-Clinic-Id) isola o Superadmin.
 */
export function clinicScope(profile, gestorClinicIds = []) {
  if (profile.active_clinic_id) return [profile.active_clinic_id];
  if (profile.role === "admin") return null;
  if (profile.role === "supervisor_plataforma") return gestorClinicIds || [];
  if (profile.clinic_id) return [profile.clinic_id];
  return [];
}

export function assertClinicAccess(scope, clinicId) {
  if (scope === null) return true;
  return Array.isArray(scope) && scope.includes(clinicId);
}

/** Clínica efetiva para criar registros (unit_id / clinica_id). */
export function resolveUnitId(profile, bodyUnitId) {
  if (profile.active_clinic_id) return profile.active_clinic_id;
  if (bodyUnitId) return bodyUnitId;
  return profile.clinic_id || null;
}
