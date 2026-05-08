export const UserGroup = {
  Admin: "ADMIN",
  Contributor: "CONTRIBUTOR",
  Student: "STUDENT",
} as const;

export type UserGroup = (typeof UserGroup)[keyof typeof UserGroup];
