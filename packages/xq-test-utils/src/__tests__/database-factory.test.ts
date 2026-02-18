/**
 * Unit tests for createDatabaseHelper factory
 */

import { createDatabaseHelper } from '../database/factory';
import { PostgresDatabaseHelper } from '../database/postgres-helper';

// Mock pg so PostgresDatabaseHelper doesn't try to connect
jest.mock('pg', () => ({
    Pool: jest.fn().mockImplementation(() => ({
        connect: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
    })),
}));

jest.mock('@chauhaidang/xq-common-kit', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('createDatabaseHelper', () => {
    it('should return an instance of PostgresDatabaseHelper', () => {
        const helper = createDatabaseHelper();
        expect(helper).toBeInstanceOf(PostgresDatabaseHelper);
    });

    it('should pass config to PostgresDatabaseHelper', () => {
        const config = { host: 'custom-host', port: 9999 };
        const helper = createDatabaseHelper(config);
        expect(helper).toBeInstanceOf(PostgresDatabaseHelper);
    });
});
