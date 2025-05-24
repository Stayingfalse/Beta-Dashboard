import { NextRequest, NextResponse } from "next/server";
import mariadb from "mariadb";

const pool = mariadb.createPool({
  host: process.env.MARIADB_HOST,
  user: process.env.MARIADB_USER,
  password: process.env.MARIADB_PASSWORD,
  database: process.env.MARIADB_DATABASE,
  connectionLimit: 5,
});

async function getUserFromToken(token: string) {
  const conn = await pool.getConnection();
  try {
    const [session] = await conn.query(
      "SELECT uid FROM sessions WHERE token = ?",
      [token]
    );
    if (!session) return null;
    const [user] = await conn.query(
      "SELECT id, email FROM users WHERE id = ?",
      [session.uid]
    );
    return user || null;
  } finally {
    conn.release();
  }
}

export async function GET(req: NextRequest) {
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
    // Upsert link for user
    await conn.query(
      `INSERT INTO links (uid, url) VALUES (?, ?) ON DUPLICATE KEY UPDATE url = VALUES(url)`,
      [user.id, url]
    );
    return NextResponse.json({ success: true });
  } finally {
    conn.release();
  }
}
