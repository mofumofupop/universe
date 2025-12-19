import { cors } from "hono/cors";
import app from "../src/index.js";
import { handle } from "hono/vercel";

export const config = {
  runtime: "nodejs",
  maxDuration: 30,
};

// CORSは必ず最初に
app.use("/api/*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["*"],
  credentials: true,
}));

export default handle(app);
