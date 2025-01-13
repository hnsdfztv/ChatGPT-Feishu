// import { Application } from "https://deno.land/x/oak/mod.ts";
// import { router } from "./routes.ts";
// import { initDB } from "./sqlite.ts";
import { serve } from "https://deno.land/std/http/server.ts";
import { handleEvent } from "./event.ts";


// const app = new Application();
// const port = 8000;

// 初始化数据库
// await initDB();

// 注册中间件
// app.use(router.routes());
// app.use(router.allowedMethods());

// console.log(`Server running on port ${port}`);
// await app.listen({ port });


// serve(async (req) => {
//     if (req.method === "POST") {
//         const body = await req.json();
//         const result = await handleEvent(body, {});
//         return Response.json(result);
//     }
//     return new Response("Hello! This is ChatGPT for Feishu");
// });


serve(async (req) => {
    if (req.method === "POST") {
        try {
            const body = await req.json();
            const result = await handleEvent(body, {});
            return Response.json(result);
        } catch (e) {
            return Response.json({ error: e.message }, { status: 500 });
        }
    }

    if (req.method === "GET") {
        if (req.url.endsWith("/health")) {
            return Response.json({ status: "ok" });
        }
        return new Response("Feishu ChatBot is running!");
    }
});