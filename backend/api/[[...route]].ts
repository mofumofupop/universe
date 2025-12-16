import app from "../src/index";
import { handle } from "hono/vercel";

export const config = {
  runtime: "nodejs",
  maxDuration: 30,
};

export default handle(app);
