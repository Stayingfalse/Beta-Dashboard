import { NextRequest, NextResponse } from "next/server";
import mariadb from "mariadb";

// Parse MARIADB_URL from environment
const dbUrl = process.env.MARIADB_URL;
if (!dbUrl) throw new Error("MARIADB_URL not set");
const url = new URL(dbUrl);
const pool = mariadb.createPool({
  host: url.hostname,
  user: url.username,
  password: url.password,
  port: Number(url.port) || 3306,
  database: url.pathname.replace(/^\//, ""),
  connectionLimit: 5,
});

async function getUserByEmail(email: string) {
  const conn = await pool.getConnection();
  try {
    const rows = await conn.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    return rows[0] || null;
  } finally {
    conn.release();
  }
}

async function createUser(email: string) {
  const conn = await pool.getConnection();
  try {
    const domain = email.split('@')[1] || null;
    const res = await conn.query("INSERT INTO users (email, is_admin, domain) VALUES (?, false, ?)", [email, domain]);
    return { uid: res.insertId, email, is_admin: false, domain };
  } finally {
    conn.release();
  }
}

async function createSession(uid: number) {
  const conn = await pool.getConnection();
  try {
    const expires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
    const token = Math.random().toString(36).slice(2) + Date.now();
    await conn.query(
      "INSERT INTO sessions (uid, token, expires) VALUES (?, ?, ?)",
      [uid, token, expires]
    );
    return { token, expires };
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
  const session = await createSession(user.uid);
  return NextResponse.json({ exists: true, is_admin: false, token: session.token, expires: session.expires });
}

export async function PUT(req: NextRequest) {
  // Sign up flow
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  const user = await createUser(email);
  const session = await createSession(user.uid);
  return NextResponse.json({ created: true, token: session.token, expires: session.expires });
}
