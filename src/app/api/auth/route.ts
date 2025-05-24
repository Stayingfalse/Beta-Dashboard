import { NextRequest, NextResponse } from "next/server";
import mariadb from "mariadb";
import { randomUUID } from "crypto";

// Parse MARIADB_URL from environment
const dbUrl = process.env.MARIADB_URL || "";
let pool: mariadb.Pool | null = null;

if (dbUrl) {
  const url = new URL(dbUrl);
  pool = mariadb.createPool({
    host: url.hostname,
    user: url.username,
    password: url.password,
    port: Number(url.port) || 3306,
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: 5,
  });
}

async function getUserByEmail(email: string) {
  if (!pool) throw new Error("MARIADB_URL not set");
  const conn = await pool.getConnection();
  try {
    const rows = await conn.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    return rows[0] || null;
  } finally {
    conn.release();
  }
}

async function createUser(email: string) {
  if (!pool) throw new Error("MARIADB_URL not set");
  const conn = await pool.getConnection();
  try {
    const domain = email.split('@')[1] || null;
    const userId = randomUUID();
    await conn.query("INSERT INTO users (id, email, is_admin, domain) VALUES (?, ?, false, ?)", [userId, email, domain]);
    return { uid: userId, email, is_admin: false, domain };
  } finally {
    conn.release();
  }
}

async function createSession(uid: string) {
  if (!pool) throw new Error("MARIADB_URL not set");
  const conn = await pool.getConnection();
  try {
    const expires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
    const token = randomUUID(); // Use a real UUID
    await conn.query(
      "INSERT INTO sessions (uid, token, expires) VALUES (?, ?, ?)",
      [uid, token, expires]
    );
    return { token, expires };
  } finally {
    conn.release();
  }
}

// Create a guest session (no user, or special guest user id)
export async function GET() {
  if (!pool) return NextResponse.json({ error: "MARIADB_URL not set" }, { status: 500 });
  // You can use a special guest user id, or null/empty
  const guestUid = "guest";
  const conn = await pool.getConnection();
  try {
    const expires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
    const token = randomUUID();
    await conn.query(
      "INSERT INTO sessions (uid, token, expires) VALUES (?, ?, ?)",
      [guestUid, token, expires]
    );
    return NextResponse.json({ token, expires, guest: true });
  } finally {
    conn.release();
  }
}

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  const user = await getUserByEmail(email);
  if (!user) {
    // Not found, signal sign-up
    return NextResponse.json({ exists: false });
  }
  if (user.is_admin) {
    // Admin, require password
    return NextResponse.json({ exists: true, is_admin: true });
  }
  // Not admin, sign in directly
  const session = await createSession(user.id); // use user.id (uuid)
  return NextResponse.json({ exists: true, is_admin: false, token: session.token, expires: session.expires });
}

export async function PUT(req: NextRequest) {
  // Sign up flow
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  const user = await createUser(email);
  const session = await createSession(user.uid); // use uuid
  return NextResponse.json({ created: true, token: session.token, expires: session.expires });
}
