// Central debug flag for admin API routes
export function adminDebugLog(...args: unknown[]) {
  if (process.env.DEBUG_FLAG === "true") {
    console.log("[admin-api]", ...args);
  }
}

import mariadb from "mariadb";

export function getMariaDbPool() {
  const dbUrl = process.env.MARIADB_URL;
  const dbHost = process.env.MARIADB_HOST;
  const dbUser = process.env.MARIADB_USER;
  const dbPassword = process.env.MARIADB_PASSWORD;
  const dbPort = process.env.MARIADB_PORT;
  const dbDatabase = process.env.MARIADB_DATABASE;
  if (dbUrl) {
    const url = new URL(dbUrl);
    return mariadb.createPool({
      host: url.hostname,
      user: url.username,
      password: url.password,
      port: Number(url.port) || 3306,
      database: url.pathname.replace(/^\//, ""),
      connectionLimit: 5,
    });
  } else if (dbHost && dbUser && dbDatabase) {
    return mariadb.createPool({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      port: Number(dbPort) || 3306,
      database: dbDatabase,
      connectionLimit: 5,
    });
  } else {
    // Instead of throw, return null so API routes can handle gracefully
    return null;
  }
}
