import { NextResponse } from "next/server";
import { testDatabaseConnection, adminDebugLog } from "../../admin/helperFunctions";

export async function GET() {
    adminDebugLog("Database debug endpoint called");

    try {
        const testResult = await testDatabaseConnection();

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            environment: {
                MARIADB_URL: process.env.MARIADB_URL ? "SET" : "NOT_SET",
                MARIADB_HOST: process.env.MARIADB_HOST || "NOT_SET",
                MARIADB_USER: process.env.MARIADB_USER || "NOT_SET",
                MARIADB_DATABASE: process.env.MARIADB_DATABASE || "NOT_SET",
                MARIADB_PORT: process.env.MARIADB_PORT || "NOT_SET",
                DEBUG_FLAG: process.env.DEBUG_FLAG || "false"
            },
            connectionTest: testResult
        });
    } catch (error: unknown) {
        const errorObj = error as Error;
        adminDebugLog("Debug endpoint error:", error);
        return NextResponse.json({
            timestamp: new Date().toISOString(),
            error: errorObj.message,
            stack: errorObj.stack
        }, { status: 500 });
    }
}
