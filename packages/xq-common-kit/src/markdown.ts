import { parseStringPromise } from 'xml2js';

function formatDuration(seconds: string | number): string {
    const num = parseFloat(String(seconds)) || 0;
    if (num < 1) {
        return `${Math.round(num * 1000)}ms`;
    }
    return `${num.toFixed(2)}s`;
}

interface TestSuite {
    name?: string;
    tests?: string | number;
    failures?: string | number;
    errors?: string | number;
    time?: string | number;
    testcase?: TestCase | TestCase[];
}

interface TestCase {
    name?: string;
    time?: string | number;
    failure?: string | any;
    error?: string | any;
}

interface TestSuites {
    tests?: string | number;
    failures?: string | number;
    errors?: string | number;
    time?: string | number;
    testsuite?: TestSuite | TestSuite[];
}

interface JUnitXML {
    testsuites: TestSuites;
}

async function parseJUnitXML(xmlContent: string): Promise<JUnitXML> {
    const result = await parseStringPromise(xmlContent, {
        explicitArray: false,
        mergeAttrs: true,
    });
    return result as JUnitXML;
}

/**
 * Converts JUnit XML test results to markdown format
 * @param xmlContent - The JUnit XML content as a string
 * @returns A promise that resolves to markdown formatted test results
 */
export async function generateMarkdownFromJunit(xmlContent: string): Promise<string> {
    const junit = await parseJUnitXML(xmlContent);
    const testsuites = junit.testsuites;

    const totalTests = parseInt(String(testsuites.tests)) || 0;
    const failures = parseInt(String(testsuites.failures)) || 0;
    const errors = parseInt(String(testsuites.errors)) || 0;
    const passed = totalTests - failures - errors;
    const success = failures === 0 && errors === 0;

    let markdown = '# E2E Test Results\n\n';

    // Summary section
    markdown += '## Summary\n\n';
    markdown += `- **Status**: ${success ? '✅ PASSED' : '❌ FAILED'}\n`;
    markdown += `- **Total Tests**: ${totalTests}\n`;
    markdown += `- **Passed**: ${passed} ✅\n`;
    markdown += `- **Failed**: ${failures} ❌\n`;
    markdown += `- **Errors**: ${errors} ⚠️\n`;
    markdown += `- **Duration**: ${formatDuration(testsuites.time || 0)}\n\n`;

    // Test suites section
    markdown += '## Test Suites\n\n';

    const suites = Array.isArray(testsuites.testsuite)
        ? testsuites.testsuite
        : testsuites.testsuite
        ? [testsuites.testsuite]
        : [];

    suites.forEach((suite) => {
        const suiteFailures = parseInt(String(suite.failures)) || 0;
        const suiteErrors = parseInt(String(suite.errors)) || 0;
        const suiteTests = parseInt(String(suite.tests)) || 0;
        const suiteStatus = (suiteFailures === 0 && suiteErrors === 0) ? '✅' : '❌';
        const suiteName = suite.name || 'Unknown Suite';
        const duration = formatDuration(suite.time || 0);

        markdown += `### ${suiteStatus} ${suiteName}\n`;
        markdown += `**Duration**: ${duration} | **Tests**: ${suiteTests} | **Failed**: ${suiteFailures}\n\n`;

        const testcases = Array.isArray(suite.testcase)
            ? suite.testcase
            : (suite.testcase ? [suite.testcase] : []);

        // Group tests by status
        const passedTests = testcases.filter(t => !t.failure && !t.error);
        const failedTests = testcases.filter(t => t.failure || t.error);

        // Show passed tests (collapsed for brevity)
        if (passedTests.length > 0) {
            markdown += '<details>\n';
            markdown += `<summary>✅ Passed Tests (${passedTests.length})</summary>\n\n`;
            passedTests.forEach((test) => {
                const testDuration = formatDuration(test.time || 0);
                markdown += `- ✅ ${test.name || 'Unknown'} (${testDuration})\n`;
            });
            markdown += '\n</details>\n\n';
        }

        // Show failed tests with details (always expanded)
        if (failedTests.length > 0) {
            markdown += '#### ❌ Failed Tests\n\n';
            failedTests.forEach((test) => {
                const testDuration = formatDuration(test.time || 0);
                markdown += `**${test.name || 'Unknown'}** (${testDuration})\n\n`;

                const failureMessage = test.failure || test.error;
                if (failureMessage) {
                    const message = typeof failureMessage === 'string'
                        ? failureMessage
                        : (failureMessage._ || (failureMessage as any).message || 'No error message');

                    // Clean up message and limit length
                    const cleanMessage = String(message)
                        // eslint-disable-next-line no-control-regex
                        .replace(/\u001b\[.*?m/g, '') // Remove ANSI codes
                        .trim()
                        .split('\n')
                        .slice(0, 10) // Limit to first 10 lines
                        .join('\n');

                    markdown += '<details>\n';
                    markdown += '<summary>Error Details</summary>\n\n';
                    markdown += '```\n';
                    markdown += cleanMessage;
                    markdown += '\n```\n';
                    markdown += '</details>\n\n';
                }
            });
        }
    });

    return markdown;
}
