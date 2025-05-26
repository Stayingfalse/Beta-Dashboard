import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { getMariaDbPool } from "../admin/helperFunctions";

async function getUserByEmail(email: string) {
  const pool = getMariaDbPool();
  if (!pool) return null;
  const conn = await pool.getConnection();
  try {
    const rows = await conn.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    return rows[0] || null;
  } finally {
    conn.release();
  }
}

// Set or update admin password (hash)
async function setAdminPassword(email: string, password: string) {
  const pool = getMariaDbPool();
  if (!pool) return;
  const conn = await pool.getConnection();
  try {
    const hash = await bcrypt.hash(password, 10);
    await conn.query("UPDATE users SET password_hash = ?, is_admin = true WHERE email = ?", [hash, email]);
  } finally {
    conn.release();
  }
}

// Check password for admin
async function checkAdminPassword(email: string, password: string) {
  const user = await getUserByEmail(email);
  if (!user) return false;
  if (!user.password_hash) {
    // No password set, set this password now
    await setAdminPassword(email, password);
    return true;
  }
  return bcrypt.compare(password, user.password_hash);
}

// Helper to get or create domain and check if enabled
async function getOrCreateDomain(domain: string) {
  const pool = getMariaDbPool();
  if (!pool) return { id: null, is_enabled: false };
  const conn = await pool.getConnection();
  try {
    // Check if domain exists
    const [row] = await conn.query("SELECT * FROM domains WHERE name = ? LIMIT 1", [domain]);
    if (row) {
      return { id: row.id, is_enabled: !!row.is_enabled };
    } else {
      // Create new domain
      await conn.query("INSERT INTO domains (name, is_enabled) VALUES (?, false)", [domain]);
      const [newRow] = await conn.query("SELECT * FROM domains WHERE name = ? LIMIT 1", [domain]);
      return { id: newRow.id, is_enabled: false };
    }
  } finally {
    conn.release();
  }
}

async function createUser(email: string) {
  const pool = getMariaDbPool();
  if (!pool) return null;
  const conn = await pool.getConnection();
  try {
    const domain = (email.split('@')[1] || '').toLowerCase();
    const userId = randomUUID();
    // Ensure domain exists in domains table
    const domainInfo = await getOrCreateDomain(domain);
    await conn.query("INSERT INTO users (id, email, is_admin, domain_id) VALUES (?, ?, false, ?)", [userId, email, domainInfo.id]);
    return { uid: userId, email, is_admin: false, domain };
  } finally {
    conn.release();
  }
}

async function createSession(uid: string) {
  const pool = getMariaDbPool();
  if (!pool) return { token: null, expires: null };
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
export async function GET(req: NextRequest) {
  const pool = getMariaDbPool();
  if (!pool) {
    return NextResponse.json({ error: "Database is not configured. Please set MARIADB_URL or all required MariaDB environment variables." }, { status: 500 });
  }
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
  const pool = getMariaDbPool();
  if (!pool) return;
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
  const pool = getMariaDbPool();
  if (!pool) {
    return NextResponse.json({ error: "Database is not configured. Please set MARIADB_URL or all required MariaDB environment variables." }, { status: 500 });
  }
  const { email, password } = await req.json();
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
    if (!password) {
      return NextResponse.json({ exists: true, is_admin: true, require_password: true, domain_enabled: domainInfo.is_enabled });
    }
    const valid = await checkAdminPassword(email, password);
    if (!valid) {
      return NextResponse.json({ exists: true, is_admin: true, error: "Invalid password", domain_enabled: domainInfo.is_enabled }, { status: 401 });
    }
    // Password valid, continue
  }
  // Not admin, or admin with valid password
  // Get session token from header
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer /, "");
  if (token) {
    await linkSessionToUser(token, user.id);
  }
  const session = token ? { token, expires: null } : await createSession(user.id);
  return NextResponse.json({ exists: true, is_admin: !!user.is_admin, token: session.token, expires: session.expires, domain_enabled: domainInfo.is_enabled });
}

export async function PUT(_req: NextRequest) {
  // Sign up flow
  const { email } = await _req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  const user = await createUser(email);
  if (!user) return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  const domain = (email.split('@')[1] || '').toLowerCase();
  const domainInfo = await getOrCreateDomain(domain);
  // Get session token from header
  const authHeader = _req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer /, "");
  if (token) {
    await linkSessionToUser(token, user.uid);
  }
  const session = token ? { token, expires: null } : await createSession(user.uid);
  return NextResponse.json({ created: true, token: session.token, expires: session.expires, domain_enabled: domainInfo.is_enabled });
}
