// Central debug flag for admin API routes
export function adminDebugLog(...args: unknown[]) {
  if (process.env.DEBUG_FLAG === "true") {
    console.log("[admin-api]", ...args);
  }
}

import mariadb from "mariadb";

// Singleton pool instance
let poolInstance: mariadb.Pool | null = null;

export function getMariaDbPool() {
  // Return existing pool if already created
  if (poolInstance) {
    return poolInstance;
  }

  const dbUrl = process.env.MARIADB_URL;
  const dbHost = process.env.MARIADB_HOST;
  const dbUser = process.env.MARIADB_USER;
  const dbPassword = process.env.MARIADB_PASSWORD;
  const dbPort = process.env.MARIADB_PORT;
  const dbDatabase = process.env.MARIADB_DATABASE;
    adminDebugLog("Creating MariaDB pool with:", {
    dbUrl: dbUrl ? `${dbUrl.split(':')[0]}://${dbUrl.split('@')[0].split(':')[1]}:***@${dbUrl.split('@')[1]}` : undefined, // Better credential hiding
    dbHost,
    dbUser,
    dbPort,
    dbDatabase,
    hasPassword: !!dbPassword
  });
  
  try {
    if (dbUrl) {
      const url = new URL(dbUrl);
      adminDebugLog("Parsed URL details:", {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        username: url.username,
        hasPassword: !!url.password,
        pathname: url.pathname,
        database: url.pathname.replace(/^\//, "")
      });
      
      poolInstance = mariadb.createPool({
        host: url.hostname,
        user: url.username,
        password: url.password,
        port: Number(url.port) || 3306,
        database: url.pathname.replace(/^\//, ""),
        connectionLimit: 10, // Increased from 5 to 10
        acquireTimeout: 60000, // 60 seconds timeout for acquiring connection
        idleTimeout: 600000, // 10 minutes idle timeout
        minimumIdle: 2, // Keep minimum 2 connections open
      });
    } else if (dbHost && dbUser && dbDatabase) {
      poolInstance = mariadb.createPool({
        host: dbHost,
        user: dbUser,
        password: dbPassword,
        port: Number(dbPort) || 3306,
        database: dbDatabase,
        connectionLimit: 10, // Increased from 5 to 10
        acquireTimeout: 60000, // 60 seconds timeout for acquiring connection
        idleTimeout: 600000, // 10 minutes idle timeout
        minimumIdle: 2, // Keep minimum 2 connections open
      });
    } else {
      adminDebugLog("Missing required database configuration");
      return null;
    }

    // Test the connection immediately
    poolInstance.getConnection()
      .then(conn => {
        adminDebugLog("Database connection test successful");
        conn.release();
      })
      .catch(err => {
        adminDebugLog("Database connection test failed:", err.message);
        // Don't null the pool here, let it retry
      });

    return poolInstance;
  } catch (error) {
    adminDebugLog("Error creating MariaDB pool:", error);
    return null;
  }
}

// Function to properly close the pool (useful for graceful shutdown)
export function closeMariaDbPool() {
  if (poolInstance) {
    poolInstance.end();
    poolInstance = null;
  }
}

// Function to test database connectivity
export async function testDatabaseConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
  try {
    const pool = getMariaDbPool();
    if (!pool) {
      return { success: false, error: "No database pool available" };
    }

    const conn = await pool.getConnection();
    try {
      const result = await conn.query("SELECT 1 as test");
      adminDebugLog("Database test query successful:", result);
      return { success: true, details: result };
    } finally {
      conn.release();
    }
  } catch (error: any) {
    adminDebugLog("Database test failed:", error);
    return { 
      success: false, 
      error: error.message,
      details: {
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState
      }
    };
  }
}
