import { Hono } from "hono";
import { registerHandler } from "./routes/register.js";
import { accountHandler } from "./routes/account.js";

const app = new Hono();

app.onError((err, c) => {
  console.error(err);
  return c.json({ success: false, message: "Internal Server Error" }, 500);
});

app.get("/", (c) => {
  return c.json({ message: "API is running" });
});

app.post("/api/register", registerHandler);
app.get("/api/account", accountHandler);

export default app;
