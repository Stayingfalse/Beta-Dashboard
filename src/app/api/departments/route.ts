import { NextRequest, NextResponse } from "next/server";
import mariadb from "mariadb";

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

export async function GET(req: NextRequest) {
  if (!pool) return NextResponse.json({ error: "MARIADB_URL not set" }, { status: 500 });
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer /, "");
  if (!token) return NextResponse.json({ error: "No session token" }, { status: 401 });
  const conn = await pool.getConnection();
  try {
    // Get user and their domain
    const [session] = await conn.query("SELECT * FROM sessions WHERE token = ? AND expires > NOW() LIMIT 1", [token]);
    if (!session || !session.uid) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const [user] = await conn.query("SELECT id, domain, department_id FROM users WHERE id = ? LIMIT 1", [session.uid]);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });
    // Get departments for the user's domain
    const departments = await conn.query("SELECT id, name FROM departments WHERE domain = ? ORDER BY name ASC", [user.domain]);
    return NextResponse.json({ departments });
  } finally {
    conn.release();
  }
}

export async function POST(req: NextRequest) {
  if (!pool) return NextResponse.json({ error: "MARIADB_URL not set" }, { status: 500 });
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer /, "");
  if (!token) return NextResponse.json({ error: "No session token" }, { status: 401 });
  const { department_id } = await req.json();
  if (!department_id) return NextResponse.json({ error: "No department_id provided" }, { status: 400 });
  const conn = await pool.getConnection();
  try {
    // Get user
    const [session] = await conn.query("SELECT * FROM sessions WHERE token = ? AND expires > NOW() LIMIT 1", [token]);
    if (!session || !session.uid) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    // Check department exists for user's domain
    const [user] = await conn.query("SELECT id, domain FROM users WHERE id = ? LIMIT 1", [session.uid]);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });
    const [dept] = await conn.query("SELECT id FROM departments WHERE id = ? AND domain = ? LIMIT 1", [department_id, user.domain]);
    if (!dept) return NextResponse.json({ error: "Invalid department for your domain" }, { status: 400 });
    // Update user's department
    await conn.query("UPDATE users SET department_id = ? WHERE id = ?", [department_id, user.id]);
    return NextResponse.json({ success: true });
  } finally {
    conn.release();
  }
}
