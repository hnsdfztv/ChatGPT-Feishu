// import { EventDB, MsgTable } from "./sqlite.ts";
import { EventDB, MsgTable } from "./db.ts";
import { GeminiApi } from "./gemini.ts";
import { getConfig } from "./config.ts";
import { Client } from "https://deno.land/x/lark_sdk/mod.ts";

const config = getConfig();

const client = new Client({
    appId: config.FEISHU_APP_ID,
    appSecret: config.FEISHU_APP_SECRET,
    disableTokenCache: false,
});

const gemini = new GeminiApi({
    apiKey: config.OPENAI_KEY,
    model: config.OPENAI_MODEL
});

// ...existing code from event.js...
// (保留原有的所有函数实现,只需要修改import和一些语法适配)

// 日志辅助函数，请贡献者使用此函数打印关键日志
function logger(...params: any[]) {
    console.debug(`[CF]`, ...params);
}

async function getOpenaiImageUrl(prompt: string) {
    return "暂不支持图片生成";
}

// 回复消息
async function reply(messageId: string, content: string) {
    try {
        return await client.im.message.reply({
            path: {
                message_id: messageId,
            },
            data: {
                content: JSON.stringify({
                    text: content,
                }),
                msg_type: "text",
            },
        });
    } catch (e) {
        logger("send message to feishu error", e, messageId, content);
    }
}

// 根据sessionId构造用户会话
async function buildConversation(sessionId: string, question: string) {
    let prompt: { role: string; content: string }[] = [];

    // 从 MsgTable 表中取出历史记录构造 question
    const historyMsgs = await (await MsgTable.where({ sessionId })).find();
    for (const conversation of historyMsgs) {
        prompt.push({ "role": "user", "content": conversation.question });
        prompt.push({ "role": "assistant", "content": conversation.answer });
    }

    // 拼接最新 question
    prompt.push({ "role": "user", "content": question });
    return prompt;
}

// 保存用户会话
async function saveConversation(sessionId: string, question: string, answer: string) {
    const msgSize = question.length + answer.length;
    const result = await MsgTable.save({
        sessionId,
        question,
        answer,
        msgSize,
    });
    if (result) {
        await discardConversation(sessionId);
    }
}

// 如果历史会话记录大于OPENAI_MAX_TOKEN，则从第一条开始抛弃超过限制的对话
async function discardConversation(sessionId: string) {
    let totalSize = 0;
    const countList: { msgId: any; totalSize: number }[] = [];
    const historyMsgs = await (await MsgTable.where({ sessionId } as any)).sort({ createdAt: -1 }).find();
    const historyMsgLen = historyMsgs.length;
    for (let i = 0; i < historyMsgLen; i++) {
        const msgId = historyMsgs[i]._id;
        totalSize += historyMsgs[i].msgSize;
        countList.push({
            msgId,
            totalSize,
        });
    }
    for (const c of countList) {
        if (c.totalSize > config.OPENAI_MAX_TOKEN) {
            const msg = await MsgTable.where({ _id: c.msgId } as any);
            await msg.delete();
        }
    }
}

// 清除历史会话
async function clearConversation(sessionId: string) {
    const msgTable = await MsgTable.where({ sessionId });
    return await msgTable.delete();
}

// 指令处理
async function cmdProcess(cmdParams: any) {
    if (cmdParams && cmdParams.action.startsWith("/image")) {
        const len = cmdParams.action.length;
        const prompt = cmdParams.action.substring(7, len);
        logger(prompt);
        const url = await getOpenaiImageUrl(prompt);
        await reply(cmdParams.messageId, url);
        return;
    }
    switch (cmdParams && cmdParams.action) {
        case "/help":
            await cmdHelp(cmdParams.messageId);
            break;
        case "/clear":
            await cmdClear(cmdParams.sessionId, cmdParams.messageId);
            break;
        default:
            await cmdHelp(cmdParams.messageId);
            break;
    }
    return { code: 0 };
}

// 帮助指令
async function cmdHelp(messageId: string) {
    const helpText = `ChatGPT 指令使用指南

Usage:
    /clear    清除上下文
    /help     获取更多帮助
  `;
    await reply(messageId, helpText);
}

// 清除记忆指令
async function cmdClear(sessionId: string, messageId: string) {
    await clearConversation(sessionId);
    await reply(messageId, "✅记忆已清除");
}

// 通过 OpenAI API 获取回复
async function getOpenAIReply(prompt: any) {
    try {
        const response = await gemini.createChatCompletion({
            messages: prompt
        });

        if (response.status === 429) {
            return 'status code: 429.问题太多了，请稍后再试';
        }
        return response.data.choices[0].message.content.replace("\n\n", "");

    } catch (e) {
        logger(e.response.data);
        return "问题太难了 出错了. (uДu〃).";
    }
}

// 自检函数
async function doctor() {
    if (config.FEISHU_APP_ID === "") {
        return {
            code: 1,
            message: {
                zh_CN: "你没有配置飞书应用的 AppID，请检查 & 部署后重试",
                en_US: "Here is no FeiSHu APP id, please check & re-Deploy & call again",
            },
        };
    }
    if (!config.FEISHU_APP_ID.startsWith("cli_")) {
        return {
            code: 1,
            message: {
                zh_CN: "你配置的飞书应用的 AppID 是错误的，请检查后重试。飞书应用的 APPID 以 cli_ 开头。",
                en_US: "Your FeiShu App ID is Wrong, Please Check and call again. FeiShu APPID must Start with cli",
            },
        };
    }
    if (config.FEISHU_APP_SECRET === "") {
        return {
            code: 1,
            message: {
                zh_CN: "你没有配置飞书应用的 Secret，请检查 & 部署后重试",
                en_US: "Here is no FeiSHu APP Secret, please check & re-Deploy & call again",
            },
        };
    }

    if (config.FEISHU_BOTNAME === "") {
        return {
            code: 1,
            message: {
                zh_CN: "你没有配置飞书应用的名称，请检查 & 部署后重试",
                en_US: "Here is no FeiSHu APP Name, please check & re-Deploy & call again",
            },
        };
    }

    if (config.OPENAI_KEY === "") {
        return {
            code: 1,
            message: {
                zh_CN: "你没有配置 OpenAI 的 Key，请检查 & 部署后重试",
                en_US: "Here is no OpenAI Key, please check & re-Deploy & call again",
            },
        };
    }

    if (!config.OPENAI_KEY.startsWith("sk-")) {
        return {
            code: 1,
            message: {
                zh_CN: "你配置的 OpenAI Key 是错误的，请检查后重试。OpenAI 的 KEY 以 sk- 开头。",
                en_US: "Your OpenAI Key is Wrong, Please Check and call again. FeiShu APPID must Start with cli",
            },
        };
    }
    return {
        code: 0,
        message: {
            zh_CN: "✅ 配置成功，接下来你可以在飞书应用当中使用机器人来完成你的工作。",
            en_US: "✅ Configuration is correct, you can use this bot in your FeiShu App",
        },
        meta: {
            FEISHU_APP_ID: config.FEISHU_APP_ID,
            OPENAI_MODEL: config.OPENAI_MODEL,
            OPENAI_MAX_TOKEN: config.OPENAI_MAX_TOKEN,
            FEISHU_BOTNAME: config.FEISHU_BOTNAME,
        },
    };
}

async function handleReply(userInput: any, sessionId: string, messageId: string, eventId: string) {
    const question = userInput.text.replace("@_user_1", "");
    logger("question: " + question);
    const action = question.trim();
    if (action.startsWith("/")) {
        return await cmdProcess({ action, sessionId, messageId });
    }
    const prompt = await buildConversation(sessionId, question);
    const openaiResponse = await getOpenAIReply(prompt);
    await saveConversation(sessionId, question, openaiResponse);
    await reply(messageId, openaiResponse);

    // update content to the event record
    const evt_record = await (await EventDB.where({ event_id: eventId })).findOne();
    evt_record.content = userInput.text;
    await EventDB.save(evt_record);
    return { code: 0 };
}

export async function handleEvent(params: any, context: any) {
    if (params.encrypt) {
        logger("user enable encrypt key");
        return {
            code: 1,
            message: {
                zh_CN: "你配置了 Encrypt Key，请关闭该功能。",
                en_US: "You have open Encrypt Key Feature, please close it.",
            },
        };
    }
    if (params.type === "url_verification") {
        logger("deal url_verification");
        return {
            challenge: params.challenge,
        };
    }
    if (!params.hasOwnProperty("header") || context.trigger === "DEBUG") {
        logger("enter doctor");
        return await doctor();
    }
    if ((params.header.event_type === "im.message.receive_v1")) {
        let eventId = params.header.event_id;
        let messageId = params.event.message.message_id;
        let chatId = params.event.message.chat_id;
        let senderId = params.event.sender.sender_id.user_id;
        let sessionId = chatId + senderId;

        const count = await (await EventDB.where({ event_id: eventId })).count();
        if (count != 0) {
            logger("skip repeat event");
            return { code: 1 };
        }
        await EventDB.save({ event_id: eventId });

        if (params.event.message.chat_type === "p2p") {
            if (params.event.message.message_type != "text") {
                await reply(messageId, "暂不支持其他类型的提问");
                logger("skip and reply not support");
                return { code: 0 };
            }
            const userInput = JSON.parse(params.event.message.content);
            return await handleReply(userInput, sessionId, messageId, eventId);
        }

        if (params.event.message.chat_type === "group") {
            if (!params.event.message.mentions || params.event.message.mentions.length === 0) {
                logger("not process message without mention");
                return { code: 0 };
            }
            if (params.event.message.mentions[0].name != config.FEISHU_BOTNAME) {
                logger("bot name not equal first mention name ");
                return { code: 0 };
            }
            const userInput = JSON.parse(params.event.message.content);
            return await handleReply(userInput, sessionId, messageId, eventId);
        }
    }

    logger("return without other log");
    return {
        code: 2,
    };
}

// export async function handleEvent(params: any) {
//     // ...existing code from event.js module.exports function...
// }
