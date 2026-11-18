import { z } from "zod";
import { AccountStatus } from "../../generated/prisma/enums";
import { ROLES } from "../../lib/auth/authorization";

const accountStatusValues = Object.values(AccountStatus) as [
  (typeof AccountStatus)[keyof typeof AccountStatus],
  ...(typeof AccountStatus)[keyof typeof AccountStatus][],
];

export const dashboardSnapshotSchema = z.object({
  accountCounts: z.object({
    byRole: z.object({
      admin: z.number().int().nonnegative(),
      hr: z.number().int().nonnegative(),
      tl: z.number().int().nonnegative(),
      employee: z.number().int().nonnegative(),
    }),
    byStatus: z.record(z.enum(accountStatusValues), z.number().int().nonnegative()),
  }),
  activities: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      actorName: z.string().nullable(),
      category: z.enum(["security", "account"]),
      occurredAt: z.string().datetime(),
    }),
  ),
  lastUpdatedAt: z.string().datetime(),
});

export type DashboardSnapshot = z.infer<typeof dashboardSnapshotSchema>;
export type DashboardRole = (typeof ROLES)[number];
