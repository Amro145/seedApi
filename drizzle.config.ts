import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite", // D1 تستخدم محرك sqlite
  schema: "./src/db/schema.ts", // مسار ملف السكيما الذي أنشأناه
  out: "./drizzle", // المجلد الذي ستوضع فيه ملفات الـ SQL الناتجة
  dbCredentials: {
    url: ".wrangler/state/v3/d1/miniflare-D1Database/4fd9127c-108c-46bc-a48a-68f45f5fd6a5.sqlite", // مسار قاعدة البيانات المحلية (اختياري للتحقق)
  },
});