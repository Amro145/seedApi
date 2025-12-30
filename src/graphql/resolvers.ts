import { eq, inArray, and, gte, lte } from "drizzle-orm";
import { users, subscriptions, follows, reviews, projects } from "../db/schema";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { sign } from "hono/jwt";

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
        projects: async (_: any, { filter }: { filter?: any }, { db }: any) => {
            const subscribedUsersList = await db.select().from(users).where(eq(users.isSubscribed, true)).all();
            if (subscribedUsersList.length === 0) return [];

            const ownerIds = subscribedUsersList.map((u: any) => u.id);

            const conditions = [inArray(projects.ownerId, ownerIds)];

            if (filter) {
                if (filter.category) conditions.push(eq(projects.category, filter.category));
                if (filter.place) conditions.push(eq(projects.place, filter.place));
                if (filter.minPrice !== undefined) conditions.push(gte(projects.price, filter.minPrice));
                if (filter.maxPrice !== undefined) conditions.push(lte(projects.price, filter.maxPrice));
            }

            const projectList = await db.select().from(projects).where(and(...conditions)).all();
            return projectList;
        },
        pendingSubscriptions: async (_: any, __: any, { db, user }: any) => {
            // ADMIN CHECK - Replace with your actual admin email
            if (!user || user.email !== 'amrojawadi@gmail.com') {
                throw new Error('Forbidden: Admins only');
            }
            return await db.select().from(subscriptions).where(eq(subscriptions.status, 'Pending')).all();
        },
        profile: async (_: any, { userId }: { userId: string }, { db }: any) => {
            const user = await db.select().from(users).where(eq(users.id, userId)).get();
            if (!user) throw new Error("User not found");
            if (!user.isSubscribed) {
                throw new Error("User is not subscribed");
            }
            const projectsList = await db.select().from(projects).where(eq(projects.ownerId, userId)).all();
            user.projects = projectsList;
            return user;
        },
    },
    Mutation: {
        signUp: async (_: any, { email, password }: any, { db }: any) => {
            const existing = await db.select().from(users).where(eq(users.email, email)).get();
            if (existing) throw new Error("Email already exists");

            const id = uuidv4();
            const hashedPassword = await bcrypt.hash(password, 10);

            const [newUser] = await db.insert(users).values({
                id,
                email,
                password: hashedPassword,
                isSubscribed: false
            }).returning();

            return newUser;
        },
        login: async (_: any, { email, password }: any, { db, env }: any) => {
            const user = await db.select().from(users).where(eq(users.email, email)).get();
            if (!user) throw new Error("User not found");

            if (!user.password) throw new Error("User does not have a password set (try Google login)");

            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) throw new Error("Invalid password");

            const token = await sign({
                id: user.id,
                email: user.email,
                isSubscribed: user.isSubscribed,
                exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 1 week
            }, env.JWT_SECRET || env.AUTH_SECRET || "secretKey");

            return { user, token };
        },
        logout: async (_: any, __: any, { user }: any) => {
            if (!user) throw new Error("Unauthorized");
            return true;
        },
        subscribe: async (_: any, { receiptUrl }: { receiptUrl: string }, { db, user }: any) => {
            if (!user) throw new Error("Unauthorized");
            const id = uuidv4();
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
            let publicCode = Math.floor(1000 + Math.random() * 9000);

            const projectValues = {
                id,
                ownerId: user.id,
                title: input.title,
                description: input.description,
                publicCode,
                cloudinaryUrl: input.cloudinaryUrl,
                category: input.category,
                place: input.place,
                price: input.price,
            };

            try {
                const [newProject] = await db.insert(projects).values(projectValues).returning();
                return newProject;
            } catch (e: any) {
                if (e.message?.includes("UNIQUE") || e.message?.includes("constraint")) {
                    projectValues.publicCode = Math.floor(1000 + Math.random() * 9000);
                    const [newProject] = await db.insert(projects).values(projectValues).returning();
                    return newProject;
                }
                throw e;
            }
        },
        updateProfile: async (_: any, { whatsappNumber }: { whatsappNumber: string }, { db, user }: any) => {
            if (!user) throw new Error("Unauthorized");

            const [updatedUser] = await db.update(users)
                .set({ whatsappNumber })
                .where(eq(users.id, user.id))
                .returning();

            return updatedUser;
        },
        ratingProject: async (_: any, { projectId, ratingValue }: { projectId: string, ratingValue: number }, { db, user }: any) => {
            if (!user) throw new Error("Unauthorized");
            const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
            if (!project) throw new Error("Project not found");

            const [rating] = await db.insert(reviews).values({
                id: uuidv4(),
                userId: user.id,
                projectId,
                rating: ratingValue,
            }).returning();

            return rating;
        },
        approveSubscription: async (_: any, { id, userId }: { id: string, userId: string }, { db, user }: any) => {
            // ADMIN CHECK - Replace with your actual admin email
            if (!user || user.email !== 'amrojawadi@gmail.com') {
                throw new Error('Forbidden: Admins only');
            }

            // 1. Update subscription status
            await db.update(subscriptions)
                .set({ status: 'Approved' })
                .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)))
                .run();

            // 2. Grant subscription to user
            const [updatedUser] = await db.update(users)
                .set({ isSubscribed: true })
                .where(eq(users.id, userId))
                .returning();

            return updatedUser;
        },
    },
    User: {
        whatsappNumber: (parent: any, _: any, { user }: any) => {
            if (!user || (!user.isSubscribed && parent.id !== user.id)) {
                return "Locked";
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
