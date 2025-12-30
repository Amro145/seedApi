import { Hono } from "hono";
import { createYoga, createSchema } from "graphql-yoga";
import { drizzle } from "drizzle-orm/d1";
import { typeDefs } from "./graphql/schema";
import { resolvers } from "./graphql/resolvers";
import { cors } from "hono/cors";
import { Auth } from "@auth/core";
import Google from "@auth/core/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";

type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    AUTH_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Permissive CORS middleware
app.use("*", cors({
    origin: "*",
    allowMethods: ["POST", "GET", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
}));

// Auth.js configuration factory
function getAuthConfig(env: Bindings): any {
    const db = drizzle(env.DB);
    return {
        adapter: DrizzleAdapter(db),
        providers: [
            Google({
                clientId: env.GOOGLE_CLIENT_ID,
                clientSecret: env.GOOGLE_CLIENT_SECRET,
            }),
        ],
        secret: env.AUTH_SECRET || env.JWT_SECRET || "amroamro",
        trustHost: true,
        basePath: "/api/auth",
        session: { strategy: "jwt" },
        callbacks: {
            async jwt({ token, user }: any) {
                if (user) {
                    token.id = user.id;
                    token.isSubscribed = user.isSubscribed;
                }
                return token;
            },
            async session({ session, token }: any) {
                if (session.user) {
                    (session.user as any).id = token.id;
                    (session.user as any).isSubscribed = token.isSubscribed;
                }
                return session;
            },
        },
    };
}

// Auth.js Route Handler
app.all("/api/auth/*", async (c) => {
    const config = getAuthConfig(c.env);
    // Explicitly casting Auth result to Response as expected by Hono
    const res = await Auth(c.req.raw, config) as Response;
    return res;
});

// Helper to get session user for GraphQL context
async function getSessionUser(req: Request, env: Bindings) {
    const config = getAuthConfig(env);
    const url = new URL(req.url);
    url.pathname = "/api/auth/session";
    const sessionReq = new Request(url.toString(), {
        headers: req.headers,
    });
    const sessionRes = await Auth(sessionReq, config) as Response;
    const sessionData: any = await sessionRes.json();
    return sessionData?.user || null;
}

// GraphQL Yoga Setup
const yoga = createYoga<{
    Bindings: Bindings;
}>({
    schema: createSchema({
        typeDefs,
        resolvers,
    }),
    context: async (ctx: any) => {
        const db = drizzle(ctx.Bindings.DB);
        const user = await getSessionUser(ctx.request, ctx.Bindings);
        return { db, user, env: ctx.Bindings };
    },
    graphqlEndpoint: "/graphql",
});

app.all("/graphql", async (c) => yoga.handle(c.req.raw, { Bindings: c.env }));

// Test Page
app.get("/test", (c) => {
    return c.html(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>SeedSeed Auth.js Test</title>
        </head>
        <body style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
            <h2>SeedSeed Auth.js Test</h2>
            <div id="auth-status">Checking session...</div>
            <button id="login-btn" style="display:none;" onclick="location.href='/api/auth/signin'">Login with Google</button>
            <button id="logout-btn" style="display:none;" onclick="handleLogout()">Logout</button>
            
            <script>
                async function checkSession() {
                    const res = await fetch("/api/auth/session");
                    const session = await res.json();
                    const status = document.getElementById("auth-status");
                    const loginBtn = document.getElementById("login-btn");
                    const logoutBtn = document.getElementById("logout-btn");

                    if (session && session.user) {
                        status.innerHTML = "Logged in as: " + session.user.email;
                        logoutBtn.style.display = "block";
                        loginBtn.style.display = "none";
                    } else {
                        status.innerHTML = "Not logged in";
                        loginBtn.style.display = "block";
                        logoutBtn.style.display = "none";
                    }
                }

                async function handleLogout() {
                    location.href = "/api/auth/signout";
                }

                checkSession();
            </script>
        </body>
        </html>
    `);
});

export default app;
