import { Hono } from "hono";
import { cors } from "hono/cors";
import app from "../src/index.js";
import { handle } from "hono/vercel";

export const config = {
  runtime: "nodejs",
  maxDuration: 30,
};

const vercelApp = new Hono();
vercelApp.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["*"],
  credentials: true,
}));
vercelApp.route("/*", app);
export default handle(vercelApp);
