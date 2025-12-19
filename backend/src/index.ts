import { Hono } from "hono";
import { registerHandler } from "./routes/register.js";
import { accountHandler } from "./routes/account.js";
import { qrHandler } from "./routes/qr.js";
import { exchangeHandler } from "./routes/exchange.js";
import { userHandler } from "./routes/user.js";
import { loginHandler } from "./routes/login.js";
import iconHandler from "./routes/icon.js";

const app = new Hono();

app.use('*', async (c, next) => {
  const origin = c.req.header('Origin') || '*';
  c.header('Access-Control-Allow-Origin', origin);
  c.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE, PUT');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Vary', 'Origin');

  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204);
  }

  await next();
});

app.onError((err, c) => {
  console.error(err);
  return c.json({ success: false, message: "Internal Server Error" }, 500);
});

app.get("/", (c) => {
  return c.json({ message: "API is running" });
});

app.post("/api/register", registerHandler);
app.post("/api/login", loginHandler);
app.post("/api/account", accountHandler);
app.post("/api/qr", qrHandler);
app.post("/api/exchange", exchangeHandler);
app.post("/api/icon", iconHandler);
app.get("/api/user", userHandler);

export default app;
