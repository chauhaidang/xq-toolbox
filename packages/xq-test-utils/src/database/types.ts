/**
 * Database helper interfaces and types.
 *
 * Consumers code to IDatabaseHelper so implementations
 * (Postgres today, others tomorrow) can be swapped without
 * changing calling code.
 */

import { PoolClient, QueryResult, QueryResultRow } from 'pg';

export interface DatabaseConfig {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    connectionString?: string;
    ssl?: boolean | { rejectUnauthorized: boolean };
}

export interface HealthCheckResult {
    connection: boolean;
    schema: boolean;
    healthy: boolean;
}

export interface IDatabaseHelper {
    /** Initialise the connection pool */
    connect(): Promise<void>;

    /** Tear down the connection pool */
    disconnect(): Promise<void>;

    /** Execute a parameterised query */
    query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>>;

    /** Obtain a raw client for transactions */
    getClient(): Promise<PoolClient>;

    /** Quick connectivity probe */
    checkConnection(): Promise<boolean>;

    /** Assert that required tables exist */
    verifySchema(requiredTables: string[]): Promise<void>;

    /** Full health probe (connection + optional schema) */
    healthCheck(requiredTables?: string[]): Promise<HealthCheckResult>;
}
