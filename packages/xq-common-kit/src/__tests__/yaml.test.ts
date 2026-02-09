import { readYAML } from '../yaml';
import * as fs from 'fs';
import * as path from 'path';

describe('Yaml module', () => {
    it('should load yaml file correctly', () => {
        // Create a temporary YAML file for testing
        const tempYamlPath = path.join(__dirname, 'temp_test.yaml');
        const yamlContent = `
        name: Test
        version: 1.0.0
        description: This is a test YAML file.
        services:
            simple-service:
              tag: 1.0.0
              environmentVariables:
                - ENV_VAR1=value1
                - ENV_VAR2=value2

            another-service:
                tag: 2.1.0
                environmentVariables:
                  - ENV_VAR_A=valueA
                  - ENV_VAR_B=valueB
        `;
        fs.writeFileSync(tempYamlPath, yamlContent);

        // Read the YAML file using the readYAML function
        const result = readYAML(tempYamlPath);

        // Validate the content
        expect(result).toEqual({
            name: 'Test',
            version: '1.0.0',
            description: 'This is a test YAML file.',
            services: {
                'simple-service': {
                    tag: '1.0.0',
                    environmentVariables: ['ENV_VAR1=value1', 'ENV_VAR2=value2']
                },
                'another-service': {
                    tag: '2.1.0',
                    environmentVariables: ['ENV_VAR_A=valueA', 'ENV_VAR_B=valueB']
                }
            }
        });

        // Clean up the temporary file
        fs.unlinkSync(tempYamlPath);
    });
});
