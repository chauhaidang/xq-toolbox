import { readFileSync } from 'fs';
import * as path from 'path';

let configPath: Buffer | null = null;

function loadConfig(): Buffer {
    try {
        return readFileSync(path.resolve(process.cwd().toString(), 'xq.json'));
    } catch (error) {
        throw new Error('xq.json file does not exist!');
    }
}

/**
 * Reads and parses the xq.json configuration file from the current working directory
 * @returns The parsed configuration object
 * @throws Error if xq.json file does not exist
 */
export function getConfig(): any {
    if (!configPath) {
        configPath = loadConfig();
    }
    return JSON.parse(configPath.toString());
}
