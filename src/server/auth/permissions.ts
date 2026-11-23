export const permissions = [
  "reservations.view",
  "reservations.manage",
  "content.manage",
  "media.manage",
  "settings.manage",
  "users.manage",
  "audit.view",
] as const;
export type Permission = (typeof permissions)[number];

export const defaultRoles: { key: string; name: string; permissions: Permission[] }[] = [
  { key: "owner", name: "Owner", permissions: [...permissions] },
  {
    key: "manager",
    name: "Manager",
    permissions: ["reservations.view", "reservations.manage", "content.manage", "media.manage", "audit.view"],
  },
  { key: "reservations", name: "Reservations agent", permissions: ["reservations.view", "reservations.manage"] },
  { key: "editor", name: "Content editor", permissions: ["content.manage", "media.manage"] },
];

export function hasPermission(granted: readonly string[], needed: Permission): boolean {
  return granted.includes(needed);
}
