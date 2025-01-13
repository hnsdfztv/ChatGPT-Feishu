import { Router } from "https://deno.land/x/oak/mod.ts";
import { handleEvent } from "./event.ts";

export const router = new Router();

router.post("/webhook", async (ctx) => {
    const body = await ctx.request.body().value;
    const result = await handleEvent(body, ctx);
    ctx.response.body = result;
});

router.get("/health", (ctx) => {
    ctx.response.body = { status: "ok" };
});
