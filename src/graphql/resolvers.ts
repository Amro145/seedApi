import { eq } from "drizzle-orm";
import { users, projects, subscriptions, follows, reviews } from "../db/schema";
import { v4 as uuidv4 } from "uuid";

export const resolvers = {
    Query: {
        project: async (_: any, { publicCode }: { publicCode: number }, { db }: any) => {
            return await db.select().from(projects).where(eq(projects.publicCode, publicCode)).get();
        },
        me: async (_: any, __: any, { db, user }: any) => {
            if (!user) return null;
            return await db.select().from(users).where(eq(users.id, user.id)).get();
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
        createProject: async (_: any, { input }: { input: any }, { db, user }: any) => {
            if (!user) throw new Error("Unauthorized");

            const id = uuidv4();
            const publicCode = Math.floor(1000 + Math.random() * 9000);

            const [newProject] = await db.insert(projects).values({
                id,
                ownerId: user.id,
                title: input.title,
                description: input.description,
                publicCode,
                cloudinaryUrl: input.cloudinaryUrl,
            }).returning();

            return newProject;
        },
        updateProfile: async (_: any, { whatsappNumber }: { whatsappNumber: string }, { db, user }: any) => {
            if (!user) throw new Error("Unauthorized");

            const [updatedUser] = await db.update(users)
                .set({ whatsappNumber })
                .where(eq(users.id, user.id))
                .returning();

            return updatedUser;
        }
    },
    User: {
        whatsappNumber: (parent: any, _: any, { user }: any) => {
            if (!user || (!user.isSubscribed && parent.id !== user.id)) {
                return "Locked - Subscribe to View";
            }
            return parent.whatsappNumber;
        },
        projects: async (parent: any, _: any, { db }: any) => {
            return await db.select().from(projects).where(eq(projects.ownerId, parent.id)).all();
        },
        reviews: async (parent: any, _: any, { db }: any) => {
            return await db.select().from(reviews).where(eq(reviews.userId, parent.id)).all();
        }
    },
    Project: {
        owner: async (parent: any, _: any, { db }: any) => {
            return await db.select().from(users).where(eq(users.id, parent.ownerId)).get();
        },
    },
};
