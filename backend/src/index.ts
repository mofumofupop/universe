import { Hono } from "hono";
import type { AppEnv } from "./lib/db.js";
import { registerHandler } from "./routes/register.js";
import { changeHandler } from "./routes/change.js";
import { passwordHandler } from "./routes/password.js";
import { accountHandler } from "./routes/account.js";
import { qrHandler } from "./routes/qr.js";
import { exchangeHandler } from "./routes/exchange.js";
import { userAsRequesterHandler, userHandler } from "./routes/user.js";
import { loginHandler } from "./routes/login.js";
import { iconHandler, iconFileHandler } from "./routes/icon.js";
import { rscPayloadHandler } from "./routes/rsc-payload.js";

const app = new Hono<AppEnv>();

app.onError((err, c) => {
  console.error(err);
  return c.json({ success: false, message: "Internal Server Error" }, 500);
});

app.get("/api", (c) => {
  return c.json({ message: "API is running" });
});

app.post("/api/register", registerHandler);
app.post("/api/change", changeHandler);
app.post("/api/password", passwordHandler);
app.post("/api/login", loginHandler);
app.post("/api/account", accountHandler);
app.post("/api/qr", qrHandler);
app.post("/api/exchange", exchangeHandler);
app.post("/api/icon", iconHandler);
app.get("/api/user", userHandler);
app.post("/api/user", userAsRequesterHandler);
app.get("/icons/:file", iconFileHandler);
app.get("*", async (c, next) =>
  new URL(c.req.url).pathname.endsWith(".txt") ? rscPayloadHandler(c) : next(),
);

app.notFound((c) => {
  return c.json({ success: false, message: "Not Found" }, 404);
});

export default app;
