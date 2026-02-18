/**
 * PostgreSQL implementation of IDatabaseHelper.
 *
 * Provides connection pooling, health checks, and query utilities
 * for component tests that need direct database access.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { logger } from '@chauhaidang/xq-common-kit';
import { DatabaseConfig, HealthCheckResult, IDatabaseHelper } from './types';

export class PostgresDatabaseHelper implements IDatabaseHelper {
    private pool: Pool | null = null;
    private config: Record<string, unknown>;

    constructor(config?: DatabaseConfig) {
        this.config = (config || this.getDefaultConfig()) as Record<string, unknown>;
    }

    /**
     * Get default database configuration from environment variables
     */
    private getDefaultConfig(): Record<string, unknown> {
        const poolConfig: Record<string, unknown> = {
            max: 5,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        };

        // Use environment variables if available, otherwise use defaults for local development
        poolConfig.host = process.env.DB_HOST || 'localhost';
        poolConfig.port = parseInt(process.env.DB_PORT || '5432', 10);
        poolConfig.database = process.env.DB_NAME || 'xq_fitness';
        poolConfig.user = process.env.DB_USER || 'xq_user';
        poolConfig.password = process.env.DB_PASSWORD || 'xq_password';
        poolConfig.ssl = process.env.DB_SSL === 'true' ? true : false;
        logger.info('DB INFO ', poolConfig);
        return poolConfig;
    }

    /**
     * Initialize database connection pool
     */
    async connect(): Promise<void> {
        if (this.pool) {
            logger.warn('Database pool already initialized');
            return;
        }

        this.pool = new Pool(this.config as any);

        this.pool.on('error', (err: Error) => {
            logger.error('Unexpected error on idle database client', err);
        });

        // Verify connection
        try {
            const result = await this.query('SELECT NOW() as current_time');
            logger.info(`✅ Database connection verified: ${(result.rows[0] as any).current_time}`);
            logger.info(
                `   Connected to: ${this.config.host}:${this.config.port}/${this.config.database} as ${this.config.user}`
            );
        } catch (error: any) {
            logger.error('❌ Failed to connect to test database');
            logger.error(`   Host: ${this.config.host}:${this.config.port}`);
            logger.error(`   Database: ${this.config.database}`);
            logger.error(`   User: ${this.config.user}`);
            logger.error(`   SSL: ${JSON.stringify(this.config.ssl)}`);
            logger.error(`   Error: ${error.message}`);
            logger.error(`   Code: ${error.code || 'N/A'}`);

            // Provide helpful error message
            if (error.code === 'ECONNREFUSED') {
                throw new Error(
                    `Database connection refused. Is PostgreSQL running on ${this.config.host}:${this.config.port}?`
                );
            } else if (error.code === 'ENOTFOUND') {
                throw new Error(`Database host not found: ${this.config.host}. Check your DB_HOST environment variable.`);
            } else if (error.code === '28P01' || error.message.includes('password authentication failed')) {
                throw new Error(`Authentication failed. Check DB_USER and DB_PASSWORD environment variables.`);
            } else if (error.code === '3D000' || error.message.includes('does not exist')) {
                throw new Error(`Database '${this.config.database}' does not exist. Check your DB_NAME environment variable.`);
            }

            throw new Error(`Database connection failed: ${error.message} (code: ${error.code || 'N/A'})`);
        }
    }

    /**
     * Close database connection pool
     */
    async disconnect(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            logger.info('✅ Database connection pool closed');
        }
    }

    /**
     * Execute a database query
     */
    async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
        if (!this.pool) {
            throw new Error('Database pool not initialized. Call connect() first.');
        }

        const client = await this.pool.connect();
        try {
            return await client.query<T>(text, params);
        } finally {
            client.release();
        }
    }

    /**
     * Get a database client for transactions
     */
    async getClient(): Promise<PoolClient> {
        if (!this.pool) {
            throw new Error('Database pool not initialized. Call connect() first.');
        }
        return await this.pool.connect();
    }

    /**
     * Verify database connection is healthy
     */
    async checkConnection(): Promise<boolean> {
        try {
            const result = await this.query('SELECT 1 as health_check');
            return (result.rows[0] as any).health_check === 1;
        } catch (error) {
            logger.error('Database connection health check failed:', error);
            return false;
        }
    }

    /**
     * Verify required database schema tables exist
     */
    async verifySchema(requiredTables: string[]): Promise<void> {
        try {
            for (const tableName of requiredTables) {
                const tableCheck = await this.query<{ exists: boolean }>(
                    `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )`,
                    [tableName]
                );

                if (!tableCheck.rows[0].exists) {
                    throw new Error(`Required table '${tableName}' does not exist.`);
                }
            }

            logger.info(`✅ Database schema verified: All required tables (${requiredTables.join(', ')}) exist`);
        } catch (error: any) {
            logger.error('❌ Database schema verification failed:', error.message);
            throw new Error(`Database schema verification failed: ${error.message}`);
        }
    }

    /**
     * Comprehensive database health check
     * Verifies connection, schema, and basic functionality
     */
    async healthCheck(requiredTables?: string[]): Promise<HealthCheckResult> {
        const result: HealthCheckResult = {
            connection: false,
            schema: false,
            healthy: false,
        };

        try {
            // Check connection
            result.connection = await this.checkConnection();

            if (!result.connection) {
                logger.error('❌ Database connection health check failed');
                return result;
            }

            // Check schema if tables are specified
            if (requiredTables && requiredTables.length > 0) {
                try {
                    await this.verifySchema(requiredTables);
                    result.schema = true;
                } catch {
                    logger.error('❌ Database schema check failed');
                    return result;
                }
            } else {
                result.schema = true; // Skip schema check if no tables specified
            }

            result.healthy = result.connection && result.schema;

            if (result.healthy) {
                logger.info('✅ Database health check passed');
            } else {
                logger.error('❌ Database health check failed');
            }

            return result;
        } catch (error: any) {
            logger.error('❌ Database health check error:', error.message);
            return result;
        }
    }
}

/** @deprecated Use PostgresDatabaseHelper instead */
export const DatabaseHelper = PostgresDatabaseHelper;
