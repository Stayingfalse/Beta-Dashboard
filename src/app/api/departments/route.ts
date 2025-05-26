import { NextRequest, NextResponse } from "next/server";
import { getMariaDbPool, adminDebugLog } from "../admin/helperFunctions";

export async function GET(req: NextRequest) {
  const pool = getMariaDbPool();
  if (!pool) {
    return NextResponse.json({ error: "Database is not configured. Please set MARIADB_URL or all required MariaDB environment variables." }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer /, "");
  if (!token) return NextResponse.json({ error: "No session token" }, { status: 401 });
  const conn = await pool.getConnection();
  try {
    // Get user and their domain_id
    const [session] = await conn.query("SELECT * FROM sessions WHERE token = ? AND expires > NOW() LIMIT 1", [token]);
    if (!session || !session.uid) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const [user] = await conn.query("SELECT id, department_id, domain_id FROM users WHERE id = ? LIMIT 1", [session.uid]);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });
    // Get departments for the user's domain_id
    const departments = await conn.query("SELECT id, name FROM departments WHERE domain_id = ? ORDER BY name ASC", [user.domain_id]);
    // Convert department ids to string (UUID)
    const safeDepartments = (departments as Array<{ [key: string]: unknown }>).map((d) => ({ id: String(d.id), name: d.name }));
    return NextResponse.json({ departments: safeDepartments });
  } finally {
    conn.release();
  }
}

export async function POST(req: NextRequest) {
  const pool = getMariaDbPool();
  if (!pool) {
    return NextResponse.json({ error: "Database is not configured. Please set MARIADB_URL or all required MariaDB environment variables." }, { status: 500 });
  }
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
    const [user] = await conn.query("SELECT id, department_id, domain_id FROM users WHERE id = ? LIMIT 1", [session.uid]);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });
    const [dept] = await conn.query("SELECT id FROM departments WHERE id = ? AND domain_id = ? LIMIT 1", [department_id, user.domain_id]);
    if (!dept) return NextResponse.json({ error: "Invalid department for your domain" }, { status: 400 });    // Update user's department
    await conn.query("UPDATE users SET department_id = ? WHERE id = ?", [department_id, user.id]);
    
    // Update the department_id on the user's existing links to prevent duplicates
    const linkUpdateResult = await conn.query("UPDATE links SET department_id = ? WHERE uid = ?", [department_id, user.id]);
    adminDebugLog('[departments] Updated user department and links', { user_id: user.id, department_id, link_updates: linkUpdateResult.affectedRows });
    
    return NextResponse.json({ success: true });
  } finally {
    conn.release();
  }
}
