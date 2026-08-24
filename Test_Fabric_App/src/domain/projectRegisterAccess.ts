export type ProjectRegisterRole = {
  role_code: string;
  active_flag: boolean;
  effective_from: Date | string;
  effective_to?: Date | string | null;
};

function calendarDate(value: Date | string): Date {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Expected a YYYY-MM-DD role effective date, received: ${value}`);
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function hasProjectRegisterAccess(
  roles: readonly ProjectRegisterRole[],
  today: Date | string,
): boolean {
  const registerRoles = roles.filter((role) => role.role_code.startsWith("project_register"));
  if (registerRoles.length === 0) return true;

  const todayDate = calendarDate(today);
  return registerRoles.some((role) => {
    if (!role.active_flag) return false;
    const effectiveFrom = calendarDate(role.effective_from);
    const effectiveTo = role.effective_to ? calendarDate(role.effective_to) : undefined;
    return effectiveFrom <= todayDate && (!effectiveTo || effectiveTo >= todayDate);
  });
}
