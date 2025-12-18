import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import app from "./index";

dotenv.config({ path: ".env.local" });

const port = Number(process.env.PORT ?? 3001);

serve({
  fetch: app.fetch,
  port,
});

console.log(`Listening on http://localhost:${port}`);
