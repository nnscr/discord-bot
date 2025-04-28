import Database from "bun:sqlite"

const db = new Database("memory.db")

const MAX_MEMORY_RECORDS = 10

// Create table if not exists
db.prepare(
    `
	CREATE TABLE IF NOT EXISTS memory (
		user_id TEXT PRIMARY KEY,
		history TEXT
	)
`,
).run()

export type MemoryRecord = {
    role: "user" | "assistant"
    content: string
}

export type MemoryRow = {
    user_id: string
    history: string
}

export function getMemory(userId: string): MemoryRecord[] {
    const row = db.prepare<MemoryRow, string>("SELECT history FROM memory WHERE user_id = ?").get(userId)
    if (!row) return []
    try {
        return JSON.parse(row.history)
    } catch {
        return []
    }
}

export function saveMemory(userId: string, history: MemoryRecord[]) {
    const json = JSON.stringify(history.slice(-MAX_MEMORY_RECORDS))
    db.prepare(
        `
		INSERT INTO memory (user_id, history)
		VALUES (?, ?)
		ON CONFLICT(user_id) DO UPDATE SET history = excluded.history
	`,
    ).run(userId, json)
}

export function clearMemory(userId: string) {
    db.prepare("DELETE FROM memory WHERE user_id = ?").run(userId)
}
