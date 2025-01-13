import { DB } from "https://deno.land/x/sqlite/mod.ts";

let db: DB;

export async function initDB() {
  db = new DB("feishu.db");
  
  db.execute(`
    CREATE TABLE IF NOT EXISTS events (
      event_id TEXT PRIMARY KEY,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      question TEXT,
      answer TEXT,
      msg_size INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export const EventDB = {
  async save(data: { event_id: string; content?: string }) {
    const { event_id, content } = data;
    db.query("INSERT INTO events (event_id, content) VALUES (?, ?)", [event_id, content]);
    return true;
  },

  async where(query: { event_id: string }) {
    const result = db.query("SELECT * FROM events WHERE event_id = ?", [query.event_id]); 
    return result.length > 0 ? result[0] : null;
  },

  async count(query: { event_id: string }) {
    const result = db.query("SELECT COUNT(*) as count FROM events WHERE event_id = ?", [query.event_id]);
    return result[0].count;
  }
};

export const MsgTable = {
  async save(data: { sessionId: string; question: string; answer: string; msgSize: number }) {
    const { sessionId, question, answer, msgSize } = data;
    db.query(
      "INSERT INTO messages (session_id, question, answer, msg_size) VALUES (?, ?, ?, ?)",
      [sessionId, question, answer, msgSize]
    );
    return true;
  },

  async where(query: { sessionId: string }) {
    return {
      find() {
        return db.query("SELECT * FROM messages WHERE session_id = ?", [query.sessionId]);
      },
      sort(options: { createdAt: number }) {
        const order = options.createdAt === -1 ? "DESC" : "ASC";
        return db.query(
          `SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ${order}`, 
          [query.sessionId]
        );
      },
      delete() {
        return db.query("DELETE FROM messages WHERE session_id = ?", [query.sessionId]);
      }
    };
  }
};
