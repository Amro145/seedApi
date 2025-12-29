import { eq } from "drizzle-orm";
import { users, projects, subscriptions, follows } from "../db/schema";


// Note: I'll use a simple UUID generator or just prefixing for demonstration 
// Since crypto.randomUUID() is available in Workers, I'll use that instead of a library if possible, 
// but since I didn't install uuid library in package.json, I'll use crypto.randomUUID().

export const resolvers = {
    Query: {
        project: async (_: any, { publicCode }: { publicCode: number }, { db }: any) => {
            const result = await db.select().from(projects).where(eq(projects.publicCode, publicCode)).get();
            return result;
        },
        me: async (_: any, __: any, { db, user }: any) => {
            if (!user) return null;
            const result = await db.select().from(users).where(eq(users.id, user.id)).get();
            return result;
        },
        users: async (_: any, __: any, { db }: any) => {
            return await db.select().from(users).all();
        },
    },
    Mutation: {
        subscribe: async (_: any, { receiptUrl }: { receiptUrl: string }, { db, user }: any) => {
            if (!user) throw new Error("Unauthorized");
            const id = crypto.randomUUID();
            const [newSub] = await db.insert(subscriptions).values({
                id,
                userId: user.id,
                receiptUrl,
                status: "Pending",
            }).returning();
            return newSub;
        },
        followUser: async (_: any, { followingId }: { followingId: string }, { db, user }: any) => {
            if (!user) throw new Error("Unauthorized");

            const existing = await db.select().from(follows)
                .where(eq(follows.followerId, user.id))
                .where(eq(follows.followingId, followingId))
                .get();

            if (existing) {
                // Toggle: Unfollow if already following
                await db.delete(follows)
                    .where(eq(follows.followerId, user.id))
                    .where(eq(follows.followingId, followingId))
                    .run();
                return false;
            } else {
                await db.insert(follows).values({
                    followerId: user.id,
                    followingId: followingId,
                }).run();
                return true;
            }
        },
    },
    User: {
        whatsappNumber: (parent: any, _: any, { user }: any) => {
            // Crucial Security Logic: whatsappNumber field must return null or a 'Locked' message 
            // if the context.user.isSubscribed is false.
            if (!user || (!user.isSubscribed && parent.id !== user.id)) {
                return "Locked";
            }
            return parent.whatsappNumber;
        },
        projects: async (parent: any, _: any, { db }: any) => {
            return await db.select().from(projects).where(eq(projects.ownerId, parent.id)).all();
        },
    },
    Project: {
        owner: async (parent: any, _: any, { db }: any) => {
            return await db.select().from(users).where(eq(users.id, parent.ownerId)).get();
        },
    },
};
