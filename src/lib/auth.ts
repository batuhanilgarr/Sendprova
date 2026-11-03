import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { db } from "./db";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
          if (adminEmail && user.email.toLowerCase() === adminEmail) {
            return { data: { ...user, role: "admin" } };
          }
          return { data: user };
        },
        after: async (user) => {
          // Every user gets a workspace. The configured admin inherits the
          // pre-auth "default" workspace so existing projects stay reachable.
          const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
          const legacy = adminEmail && user.email.toLowerCase() === adminEmail
            ? await db.workspace.findFirst({ where: { slug: "default", ownerId: null } })
            : null;
          if (legacy) {
            await db.workspace.update({ where: { id: legacy.id }, data: { ownerId: user.id, name: user.name || "My workspace" } });
          } else {
            await db.workspace.create({
              data: { ownerId: user.id, name: user.name || "My workspace", slug: `ws_${user.id}`, credits: SIGNUP_CREDITS,
                ledger: { create: { delta: SIGNUP_CREDITS, reason: "Sign-up bonus" } } },
            });
          }
        },
      },
    },
  },
  plugins: [admin({ defaultRole: "user", adminRoles: ["admin"] }), nextCookies()],
});

export const SIGNUP_CREDITS = 50;

export type Session = typeof auth.$Infer.Session;
