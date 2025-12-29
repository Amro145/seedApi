import { eq } from "drizzle-orm";
import { users, projects, subscriptions, follows, reviews } from "../db/schema";
import { v4 as uuidv4 } from "uuid";
import { SignJWT } from "jose";

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
        authGoogle: async (_: any, { idToken }: { idToken: string }, { db, env }: any) => {
            const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
            if (!response.ok) throw new Error("Invalid Google Token");

            const payload = await response.json() as any;

            // Audience verification
            if (payload.aud !== env.GOOGLE_CLIENT_ID && payload.aud !== "769512656954-hiolsrurl3hm0n7s645t55tk892jt128.apps.googleusercontent.com") {
                throw new Error("Invalid Audience");
            }

            const googleId = payload.sub;
            const email = payload.email;

            let user = await db.select().from(users).where(eq(users.googleId, googleId)).get();

            if (!user) {
                const id = uuidv4();
                [user] = await db.insert(users).values({
                    id,
                    email,
                    googleId,
                    isSubscribed: false
                }).returning();
            }

            // JWT Secret - prefer env, fallback to amroamro as requested
            const jwtSecret = env.JWT_SECRET || "amroamro";
            const secret = new TextEncoder().encode(jwtSecret);

            const token = await new SignJWT({ id: user.id, email: user.email, isSubscribed: user.isSubscribed })
                .setProtectedHeader({ alg: "HS256" })
                .setIssuedAt()
                .setExpirationTime("7d")
                .sign(secret);

            return {
                token,
                user
            };
        },
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
            // Security Logic: if current user is not authenticated or not subscribed, 
            // and looking at someone else's profile, hide the number.
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

