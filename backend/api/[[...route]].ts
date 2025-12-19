import app from "../src/index.js";
import { handle } from "hono/vercel";

export const config = {
  runtime: "nodejs",
  maxDuration: 30,
};

function withCors(handler: { (req: Request): Response | Promise<Response>; (arg0: any, arg1: any): any; }) {
  return async (req: { method: string; }, res: { setHeader: (arg0: string, arg1: string) => void; statusCode: number; end: () => void; }) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }
    return handler(req, res);
  };
}

export default withCors(handle(app));
