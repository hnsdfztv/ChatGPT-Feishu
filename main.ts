import { Application } from "https://deno.land/x/oak/mod.ts";
import { router } from "./routes.ts";
import { initDB } from "./sqlite.ts";

const app = new Application();
const port = 8000;

// 初始化数据库
await initDB();

// 注册中间件
app.use(router.routes());
app.use(router.allowedMethods());

console.log(`Server running on port ${port}`);
await app.listen({ port });
