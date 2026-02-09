import * as fs from 'fs';
import * as path from 'path';
import { getConfig } from '../config';

jest.mock('fs');
jest.mock('path');

describe('Config Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should load and parse configuration file successfully', () => {
        const mockConfig = { key: 'value' };
        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
        (path.resolve as jest.Mock).mockReturnValue('/mocked/path/xq.json');
        process.cwd = jest.fn().mockReturnValue('/mocked/path') as any;

        const config = getConfig();

        expect(fs.readFileSync).toHaveBeenCalledWith('/mocked/path/xq.json');
        expect(config).toEqual(mockConfig);
    });
});
