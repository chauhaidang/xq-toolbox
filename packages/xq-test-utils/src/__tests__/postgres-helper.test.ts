/**
 * Unit tests for PostgresDatabaseHelper
 *
 * All pg Pool interactions are mocked — no real database needed.
 */

import { PostgresDatabaseHelper, DatabaseHelper } from '../database/postgres-helper';

// ---------- mock pg ----------
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn().mockResolvedValue({ query: mockQuery, release: mockRelease });
const mockEnd = jest.fn().mockResolvedValue(undefined);
const mockOn = jest.fn();

jest.mock('pg', () => ({
    Pool: jest.fn().mockImplementation(() => ({
        connect: mockConnect,
        end: mockEnd,
        on: mockOn,
    })),
}));

// ---------- mock logger ----------
jest.mock('@chauhaidang/xq-common-kit', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('PostgresDatabaseHelper', () => {
    let db: PostgresDatabaseHelper;

    beforeEach(() => {
        jest.clearAllMocks();
        db = new PostgresDatabaseHelper({
            host: 'localhost',
            port: 5432,
            database: 'test_db',
            user: 'user',
            password: 'pass',
        });
    });

    // ---------- connect ----------
    describe('connect()', () => {
        it('should create a pool and verify the connection', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [{ current_time: '2026-01-01T00:00:00Z' }],
            });

            await db.connect();

            expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
            expect(mockConnect).toHaveBeenCalled();
            expect(mockQuery).toHaveBeenCalledWith('SELECT NOW() as current_time', undefined);
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should warn and return if pool is already initialised', async () => {
            mockQuery.mockResolvedValue({ rows: [{ current_time: 'now' }] });
            await db.connect();

            const { logger } = require('@chauhaidang/xq-common-kit');
            await db.connect();

            expect(logger.warn).toHaveBeenCalledWith('Database pool already initialized');
        });

        it('should throw on ECONNREFUSED', async () => {
            const err: any = new Error('connect ECONNREFUSED');
            err.code = 'ECONNREFUSED';
            mockQuery.mockRejectedValueOnce(err);

            await expect(db.connect()).rejects.toThrow('Database connection refused');
        });

        it('should throw on ENOTFOUND', async () => {
            const err: any = new Error('getaddrinfo ENOTFOUND');
            err.code = 'ENOTFOUND';
            mockQuery.mockRejectedValueOnce(err);

            await expect(db.connect()).rejects.toThrow('Database host not found');
        });

        it('should throw on authentication failure (28P01)', async () => {
            const err: any = new Error('password authentication failed');
            err.code = '28P01';
            mockQuery.mockRejectedValueOnce(err);

            await expect(db.connect()).rejects.toThrow('Authentication failed');
        });

        it('should throw on unknown database (3D000)', async () => {
            const err: any = new Error('database does not exist');
            err.code = '3D000';
            mockQuery.mockRejectedValueOnce(err);

            await expect(db.connect()).rejects.toThrow("does not exist");
        });

        it('should throw generic message for unknown errors', async () => {
            const err: any = new Error('something weird');
            err.code = 'UNKNOWN';
            mockQuery.mockRejectedValueOnce(err);

            await expect(db.connect()).rejects.toThrow('Database connection failed: something weird');
        });
    });

    // ---------- disconnect ----------
    describe('disconnect()', () => {
        it('should end the pool', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ current_time: 'now' }] });
            await db.connect();

            await db.disconnect();

            expect(mockEnd).toHaveBeenCalled();
        });

        it('should be safe to call when not connected', async () => {
            await expect(db.disconnect()).resolves.toBeUndefined();
        });
    });

    // ---------- query ----------
    describe('query()', () => {
        it('should throw if pool is not initialised', async () => {
            await expect(db.query('SELECT 1')).rejects.toThrow('Call connect() first');
        });

        it('should delegate to the pool client and release', async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [{ current_time: 'now' }] }) // connect probe
                .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // actual query

            await db.connect();
            const result = await db.query('SELECT $1::int as id', [1]);

            expect(result.rows).toEqual([{ id: 1 }]);
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should release the client even on query failure', async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [{ current_time: 'now' }] })
                .mockRejectedValueOnce(new Error('bad query'));

            await db.connect();
            await expect(db.query('BAD SQL')).rejects.toThrow('bad query');
            expect(mockRelease).toHaveBeenCalled();
        });
    });

    // ---------- getClient ----------
    describe('getClient()', () => {
        it('should throw if pool is not initialised', async () => {
            await expect(db.getClient()).rejects.toThrow('Call connect() first');
        });

        it('should return a pool client', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ current_time: 'now' }] });
            await db.connect();

            const client = await db.getClient();
            expect(client).toBeDefined();
        });
    });

    // ---------- checkConnection ----------
    describe('checkConnection()', () => {
        it('should return true when healthy', async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [{ current_time: 'now' }] })
                .mockResolvedValueOnce({ rows: [{ health_check: 1 }] });

            await db.connect();
            const ok = await db.checkConnection();
            expect(ok).toBe(true);
        });

        it('should return false on failure', async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [{ current_time: 'now' }] })
                .mockRejectedValueOnce(new Error('boom'));

            await db.connect();
            const ok = await db.checkConnection();
            expect(ok).toBe(false);
        });
    });

    // ---------- verifySchema ----------
    describe('verifySchema()', () => {
        beforeEach(async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ current_time: 'now' }] });
            await db.connect();
        });

        it('should pass when all tables exist', async () => {
            mockQuery.mockResolvedValue({ rows: [{ exists: true }] });

            await expect(db.verifySchema(['users', 'orders'])).resolves.toBeUndefined();
        });

        it('should throw when a table is missing', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }] });

            await expect(db.verifySchema(['missing_table'])).rejects.toThrow(
                "Required table 'missing_table' does not exist"
            );
        });
    });

    // ---------- healthCheck ----------
    describe('healthCheck()', () => {
        beforeEach(async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ current_time: 'now' }] });
            await db.connect();
        });

        it('should return healthy when connection is good and no tables required', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ health_check: 1 }] });

            const result = await db.healthCheck();
            expect(result).toEqual({ connection: true, schema: true, healthy: true });
        });

        it('should return healthy when connection and schema are good', async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [{ health_check: 1 }] })
                .mockResolvedValueOnce({ rows: [{ exists: true }] });

            const result = await db.healthCheck(['users']);
            expect(result).toEqual({ connection: true, schema: true, healthy: true });
        });

        it('should return unhealthy when connection fails', async () => {
            mockQuery.mockRejectedValueOnce(new Error('dead'));

            const result = await db.healthCheck();
            expect(result.healthy).toBe(false);
            expect(result.connection).toBe(false);
        });

        it('should return unhealthy when schema check fails', async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [{ health_check: 1 }] })
                .mockResolvedValueOnce({ rows: [{ exists: false }] });

            const result = await db.healthCheck(['nope']);
            expect(result.healthy).toBe(false);
            expect(result.schema).toBe(false);
        });
    });

    // ---------- backward compat alias ----------
    describe('backward compatibility', () => {
        it('DatabaseHelper should be an alias for PostgresDatabaseHelper', () => {
            expect(DatabaseHelper).toBe(PostgresDatabaseHelper);
        });
    });
});
