import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "./lib/db.js";
import { registerHandler } from "./routes/register.js";
import { changeHandler } from "./routes/change.js";
import { accountHandler } from "./routes/account.js";
import { qrHandler } from "./routes/qr.js";
import { exchangeHandler } from "./routes/exchange.js";
import { userHandler } from "./routes/user.js";
import { loginHandler } from "./routes/login.js";
import { iconHandler, iconFileHandler } from "./routes/icon.js";

const app = new Hono<AppEnv>();

app.use(
  "/api/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

app.onError((err, c) => {
  console.error(err);
  return c.json({ success: false, message: "Internal Server Error" }, 500);
});

app.get("/api", (c) => {
  return c.json({ message: "API is running" });
});

app.post("/api/register", registerHandler);
app.post("/api/change", changeHandler);
app.post("/api/login", loginHandler);
app.post("/api/account", accountHandler);
app.post("/api/qr", qrHandler);
app.post("/api/exchange", exchangeHandler);
app.post("/api/icon", iconHandler);
app.get("/api/user", userHandler);
app.get("/icons/:file", iconFileHandler);

app.notFound((c) => {
  return c.json({ success: false, message: "Not Found" }, 404);
});

export default app;
