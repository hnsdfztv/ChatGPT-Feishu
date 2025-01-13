const kv = await Deno.openKv();

export const EventDB = {
    async save(data: { event_id: string; content?: string }) {
        await kv.set(["events", data.event_id], data);
        return true;
    },

    async where(query: { event_id: string }) {
        const value = await kv.get(["events", query.event_id]);
        return {
            count: () => value.value ? 1 : 0,
            findOne: () => value.value
        };
    }
};

export const MsgTable = {
    async save(data: { sessionId: string; question: string; answer: string; msgSize: number }) {
        const key = ["messages", data.sessionId, Date.now()];
        await kv.set(key, data);
        return true;
    },

    async where(query: { sessionId: string }) {
        const prefix = ["messages", query.sessionId];
        return {
            async find() {
                const messages = [];
                for await (const entry of kv.list({ prefix })) {
                    messages.push(entry.value);
                }
                return messages;
            },
            async sort(options: { createdAt: number }) {
                const messages = await this.find();
                return messages.sort((a, b) => {
                    return options.createdAt === -1 ?
                        b.createdAt - a.createdAt :
                        a.createdAt - b.createdAt;
                });
            },
            async delete() {
                for await (const entry of kv.list({ prefix })) {
                    await kv.delete(entry.key);
                }
            }
        };
    }
};