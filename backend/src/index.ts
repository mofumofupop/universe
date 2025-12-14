import { Hono } from "hono";
import { registerHandler } from "./routes/register";

const app = new Hono();

app.get("/", (c) => {
  return c.json({ message: "API is running" });
});

app.post("/api/register", registerHandler);

export default app;
