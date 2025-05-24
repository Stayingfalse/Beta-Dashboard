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

// Helper to get or create domain and check if enabled
async function getOrCreateDomain(domain: string) {
  if (!pool) throw new Error("MARIADB_URL not set");
  const conn = await pool.getConnection();
  try {
    // Check if domain exists
    const [row] = await conn.query("SELECT * FROM domains WHERE domain = ? LIMIT 1", [domain]);
    if (row) {
      return { uid: row.uid, is_enabled: !!row.is_enabled };
    } else {
      // Create new domain
      const domainUid = randomUUID();
      await conn.query("INSERT INTO domains (uid, domain, is_enabled) VALUES (?, ?, false)", [domainUid, domain]);
      return { uid: domainUid, is_enabled: false };
    }
  } finally {
    conn.release();
  }
}

async function createUser(email: string) {
  if (!pool) throw new Error("MARIADB_URL not set");
  const conn = await pool.getConnection();
  try {
    const domain = (email.split('@')[1] || '').toLowerCase();
    const userId = randomUUID();
    // Ensure domain exists in domains table
    const domainInfo = await getOrCreateDomain(domain);
    await conn.query("INSERT INTO users (id, email, is_admin, domain_id) VALUES (?, ?, false, ?)", [userId, email, domainInfo.uid]);
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
  const conn = await pool.getConnection();
  try {
    const expires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
    const token = randomUUID();
    await conn.query(
      "INSERT INTO sessions (uid, token, expires) VALUES (?, ?, ?)",
      [null, token, expires]
    );
    return NextResponse.json({ token, expires, guest: true });
  } finally {
    conn.release();
  }
}

// Update session to link to user after authentication
async function linkSessionToUser(token: string, userId: string) {
  if (!pool) throw new Error("MARIADB_URL not set");
  const conn = await pool.getConnection();
  try {
    await conn.query(
      "UPDATE sessions SET uid = ? WHERE token = ?",
      [userId, token]
    );
  } finally {
    conn.release();
  }
}

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  const user = await getUserByEmail(email);
  const domain = (email.split('@')[1] || '').toLowerCase();
  const domainInfo = await getOrCreateDomain(domain);
  if (!user) {
    // Not found, signal sign-up
    return NextResponse.json({ exists: false, domain_enabled: domainInfo.is_enabled });
  }
  if (user.is_admin) {
    // Admin, require password
    return NextResponse.json({ exists: true, is_admin: true, domain_enabled: domainInfo.is_enabled });
  }
  // Not admin, sign in directly
  // Get session token from header
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer /, "");
  if (token) {
    await linkSessionToUser(token, user.id);
  }
  const session = token ? { token, expires: null } : await createSession(user.id);
  return NextResponse.json({ exists: true, is_admin: false, token: session.token, expires: session.expires, domain_enabled: domainInfo.is_enabled });
}

export async function PUT(req: NextRequest) {
  // Sign up flow
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  const user = await createUser(email);
  const domain = (email.split('@')[1] || '').toLowerCase();
  const domainInfo = await getOrCreateDomain(domain);
  // Get session token from header
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer /, "");
  if (token) {
    await linkSessionToUser(token, user.uid);
  }
  const session = token ? { token, expires: null } : await createSession(user.uid);
  return NextResponse.json({ created: true, token: session.token, expires: session.expires, domain_enabled: domainInfo.is_enabled });
}
