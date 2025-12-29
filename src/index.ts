import { Hono } from "hono";
import { createYoga, createSchema } from "graphql-yoga";
import { drizzle } from "drizzle-orm/d1";
import { jwt } from "hono/jwt";
import { typeDefs } from "./graphql/schema";
import { resolvers } from "./graphql/resolvers";

type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// GraphQL Yoga Setup
const yoga = createYoga<{
    Bindings: Bindings;
    Variables: any;
}>({
    schema: createSchema({
        typeDefs,
        resolvers,
    }),
    // GraphQL Context injection
    context: async (ctx: any) => {
        const db = drizzle(ctx.Bindings.DB);
        const user = ctx.Variables?.jwtPayload; // Injected by JWT middleware
        return { db, user, env: ctx.Bindings };
    },
    graphqlEndpoint: "/graphql",
});

// JWT Middleware
// We use a permissive JWT middleware that doesn't block but injects user info if available
// For real-world, you might want separate routes or strict middleware for mutations.
app.use("/graphql", async (c: any, next: any) => {
    const authHeader = c.req.header("Authorization");
    if (authHeader) {
        try {
            const middleware = jwt({
                secret: c.env.JWT_SECRET,
            });
            return await middleware(c, next);
        } catch (e) {
            // If invalid token, we still proceed but without user context
            console.error("JWT Verification failed", e);
        }
    }
    await next();
});

// Single endpoint for GraphQL
app.all("/graphql", async (c: any) => yoga.handle(c.req.raw, { Bindings: c.env, Variables: c.get("jwtPayload") }));

export default app;
