export const OPERATOR_GROUP = 'Operator'
export const ADMINISTRATOR_GROUP = 'Administrator'

export type UserRole = typeof OPERATOR_GROUP | typeof ADMINISTRATOR_GROUP

export function roleFromGroups(groups: readonly string[]): UserRole {
  if (groups.includes(ADMINISTRATOR_GROUP)) {
    return ADMINISTRATOR_GROUP
  }
  return OPERATOR_GROUP
}
