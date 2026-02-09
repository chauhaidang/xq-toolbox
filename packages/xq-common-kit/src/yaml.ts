import * as fs from 'fs';
import * as yaml from 'js-yaml';

/**
 * Reads and parses a YAML file
 * @param filePath - Path to the YAML file to read
 * @returns The parsed YAML content, or null if an error occurs
 */
export function readYAML(filePath: string): any | null {
    try {
        const fileContents = fs.readFileSync(filePath, 'utf8');
        return yaml.load(fileContents);
    } catch (e) {
        console.error(`Error reading YAML file: ${e}`);
        return null;
    }
}
