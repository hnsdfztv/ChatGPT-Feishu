export function getConfig() {
  return {
    FEISHU_APP_ID: Deno.env.get("FEISHU_APP_ID") || "cli_a70e2978e27b500c",
    FEISHU_APP_SECRET: Deno.env.get("FEISHU_APP_SECRET") || "oR6YfsJY3KcCyC6N5mSu2dSJ1JRGhHRH",
    FEISHU_BOTNAME: Deno.env.get("FEISHU_BOTNAME") || "test-bot2",
    OPENAI_KEY: Deno.env.get("OPENAI_KEY") || "AIzaSyCD36kuVVNNteZ-4LMUl0kAJhFgShcZ8Lo",
    OPENAI_MODEL: Deno.env.get("OPENAI_MODEL") || "gemini-2.0-flash-exp",
    OPENAI_MAX_TOKEN: Number(Deno.env.get("OPENAI_MAX_TOKEN")) || 1024
  };
}
