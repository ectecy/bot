const Database = require("better-sqlite3");

// Create or open database file
const db = new Database("bot.db");

// -------------------- CREATE TABLE --------------------
db.prepare(`
CREATE TABLE IF NOT EXISTS economy (
    user_id TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 0
)
`).run();

// -------------------- GET BALANCE --------------------
function getBalance(userId) {
    const row = db.prepare(
        "SELECT balance FROM economy WHERE user_id = ?"
    ).get(userId);

    return row ? row.balance : 0;
}

// -------------------- ADD BALANCE --------------------
function addBalance(userId, amount) {
    const user = db.prepare(
        "SELECT user_id FROM economy WHERE user_id = ?"
    ).get(userId);

    if (!user) {
        db.prepare(
            "INSERT INTO economy (user_id, balance) VALUES (?, ?)"
        ).run(userId, amount);
    } else {
        db.prepare(
            "UPDATE economy SET balance = balance + ? WHERE user_id = ?"
        ).run(amount, userId);
    }
}

// -------------------- SET BALANCE --------------------
function setBalance(userId, amount) {
    db.prepare(`
        INSERT INTO economy (user_id, balance)
        VALUES (?, ?)
        ON CONFLICT(user_id)
        DO UPDATE SET balance = ?
    `).run(userId, amount, amount);
}

// -------------------- EXPORTS --------------------
module.exports = {
    getBalance,
    addBalance,
    setBalance
};