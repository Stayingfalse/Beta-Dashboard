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

async function getUserFromToken(token: string) {
  if (!pool) throw new Error("MARIADB_URL not set");
  const conn = await pool.getConnection();
  try {
    const [session] = await conn.query(
      "SELECT uid FROM sessions WHERE token = ?",
      [token]
    );
    if (!session) return null;
    const [user] = await conn.query(
      "SELECT id, email, department_id FROM users WHERE id = ?",
      [session.uid]
    );
    return user || null;
  } finally {
    conn.release();
  }
}

export async function GET(req: NextRequest) {
  if (!pool)
    return NextResponse.json({ error: "MARIADB_URL not set" }, { status: 500 });
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = auth.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const conn = await pool.getConnection();
  try {
    const [link] = await conn.query(
      "SELECT id, url FROM links WHERE uid = ?",
      [user.id]
    );
    return NextResponse.json({ link: link || null });
  } finally {
    conn.release();
  }
}

export async function POST(req: NextRequest) {
  if (!pool)
    return NextResponse.json({ error: "MARIADB_URL not set" }, { status: 500 });
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = auth.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  // Backend validation for Amazon UK wishlist format
  const amazonPattern = /^https:\/\/www\.amazon\.co\.uk\/hz\/wishlist\/[A-Za-z0-9?=&#_\/-]+$/;
  if (!amazonPattern.test(url)) {
    return NextResponse.json(
      { error: "Invalid Amazon UK wishlist link format." },
      { status: 400 }
    );
  }
  const conn = await pool.getConnection();
  try {
    // Upsert link for user, now including department_id
    await conn.query(
      `INSERT INTO links (uid, url, department_id) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE url = VALUES(url), department_id = VALUES(department_id)`,
      [user.id, url, user.department_id]
    );
    return NextResponse.json({ success: true });
  } finally {
    conn.release();
  }
}
