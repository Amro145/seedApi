import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import type { AdapterAccount } from "@auth/core/adapters";

export const users = sqliteTable("user", {
    id: text("id").notNull().primaryKey(),
    name: text("name"),
    email: text("email").notNull().unique(),
    emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
    image: text("image"),
    // Custom fields
    whatsappNumber: text("whatsapp_number"),
    isSubscribed: integer("is_subscribed", { mode: "boolean" }).default(false),
    subscriptionEnd: integer("subscription_end", { mode: "timestamp" }),
    password: text("password"),
});

export const accounts = sqliteTable("account", {
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
}, (account) => ({
    compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
}));

export const sessions = sqliteTable("session", {
    sessionToken: text("sessionToken").notNull().primaryKey(),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable("verificationToken", {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
}, (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
}));

export const projects = sqliteTable("projects", {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id),
    title: text("title").notNull(),
    description: text("description"),
    publicCode: integer("public_code").notNull().unique(),
    cloudinaryUrl: text("cloudinary_url"),
});

export const subscriptions = sqliteTable("subscriptions", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    receiptUrl: text("receipt_url").notNull(),
    status: text("status", { enum: ["Pending", "Approved"] }).default("Pending"),
});

export const reviews = sqliteTable("reviews", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    projectId: text("project_id").references(() => projects.id),
    targetUserId: text("target_user_id").references(() => users.id),
    rating: integer("rating").notNull(),
    comment: text("comment"),
});

export const follows = sqliteTable("follows", {
    followerId: text("follower_id").notNull().references(() => users.id),
    followingId: text("following_id").notNull().references(() => users.id),
}, (table: any) => ({
    pk: primaryKey({ columns: [table.followerId, table.followingId] }),
}));
