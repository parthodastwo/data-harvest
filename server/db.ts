import * as schema from "@shared/schema";

let pool: any;
let db: any;

const isReplit = !!process.env.REPL_ID;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

if (isReplit) {
  // Replit environment (Neon + WebSocket)
  const { Pool, neonConfig } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  const ws = (await import("ws")).default;

  neonConfig.webSocketConstructor = ws;

  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });

} else {
  // AWS EC2 or other traditional Node environment
  const pg = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { Pool } = pg.default;

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // optional depending on your DB setup
    },
  });

  db = drizzle({ client: pool, schema });
}

export { pool, db };
