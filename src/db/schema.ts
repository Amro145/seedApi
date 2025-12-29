import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    googleId: text("google_id").unique(),
    whatsappNumber: text("whatsapp_number"),
    isSubscribed: integer("is_subscribed", { mode: "boolean" }).default(false),
    subscriptionEnd: integer("subscription_end", { mode: "timestamp" }),
});

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
