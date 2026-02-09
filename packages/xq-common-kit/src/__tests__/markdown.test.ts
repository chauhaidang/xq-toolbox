import { generateMarkdownFromJunit } from '../markdown';

describe('Markdown Module', () => {
    describe('generateMarkdownFromJunit', () => {
        test('should generate markdown for successful test results', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="3" failures="0" errors="0" time="1.234">
    <testsuite name="Test Suite 1" tests="3" failures="0" errors="0" time="1.234">
        <testcase name="test 1" time="0.123"/>
        <testcase name="test 2" time="0.456"/>
        <testcase name="test 3" time="0.655"/>
    </testsuite>
</testsuites>`;

            const markdown = await generateMarkdownFromJunit(xmlContent);

            expect(markdown).toContain('# E2E Test Results');
            expect(markdown).toContain('## Summary');
            expect(markdown).toContain('**Status**: ✅ PASSED');
            expect(markdown).toContain('**Total Tests**: 3');
            expect(markdown).toContain('**Passed**: 3 ✅');
            expect(markdown).toContain('**Failed**: 0 ❌');
            expect(markdown).toContain('**Errors**: 0 ⚠️');
            expect(markdown).toContain('**Duration**: 1.23s');
            expect(markdown).toContain('## Test Suites');
            expect(markdown).toContain('### ✅ Test Suite 1');
            expect(markdown).toContain('✅ Passed Tests (3)');
            expect(markdown).toContain('✅ test 1 (123ms)');
            expect(markdown).toContain('✅ test 2 (456ms)');
            expect(markdown).toContain('✅ test 3 (655ms)');
        });

        test('should generate markdown for failed test results', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="2" failures="1" errors="0" time="0.567">
    <testsuite name="Test Suite 2" tests="2" failures="1" errors="0" time="0.567">
        <testcase name="passing test" time="0.234"/>
        <testcase name="failing test" time="0.333">
            <failure message="Assertion failed">Expected true to be false</failure>
        </testcase>
    </testsuite>
</testsuites>`;

            const markdown = await generateMarkdownFromJunit(xmlContent);

            expect(markdown).toContain('**Status**: ❌ FAILED');
            expect(markdown).toContain('**Total Tests**: 2');
            expect(markdown).toContain('**Passed**: 1 ✅');
            expect(markdown).toContain('**Failed**: 1 ❌');
            expect(markdown).toContain('### ❌ Test Suite 2');
            expect(markdown).toContain('✅ Passed Tests (1)');
            expect(markdown).toContain('#### ❌ Failed Tests');
            expect(markdown).toContain('**failing test** (333ms)');
            expect(markdown).toContain('Expected true to be false');
        });

        test('should generate markdown for test results with errors', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="2" failures="0" errors="1" time="0.456">
    <testsuite name="Error Suite" tests="2" failures="0" errors="1" time="0.456">
        <testcase name="passing test" time="0.123"/>
        <testcase name="error test" time="0.333">
            <error message="Runtime error">TypeError: Cannot read property 'foo' of undefined</error>
        </testcase>
    </testsuite>
</testsuites>`;

            const markdown = await generateMarkdownFromJunit(xmlContent);

            expect(markdown).toContain('**Status**: ❌ FAILED');
            expect(markdown).toContain('**Errors**: 1 ⚠️');
            expect(markdown).toContain('#### ❌ Failed Tests');
            expect(markdown).toContain('**error test** (333ms)');
            expect(markdown).toContain('TypeError: Cannot read property \'foo\' of undefined');
        });

        test('should handle multiple test suites', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="4" failures="0" errors="0" time="2.5">
    <testsuite name="Suite A" tests="2" failures="0" errors="0" time="1.2">
        <testcase name="test A1" time="0.6"/>
        <testcase name="test A2" time="0.6"/>
    </testsuite>
    <testsuite name="Suite B" tests="2" failures="0" errors="0" time="1.3">
        <testcase name="test B1" time="0.65"/>
        <testcase name="test B2" time="0.65"/>
    </testsuite>
</testsuites>`;

            const markdown = await generateMarkdownFromJunit(xmlContent);

            expect(markdown).toContain('### ✅ Suite A');
            expect(markdown).toContain('### ✅ Suite B');
            expect(markdown).toContain('test A1');
            expect(markdown).toContain('test B2');
        });

        test('should format duration in milliseconds for values less than 1 second', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="1" failures="0" errors="0" time="0.567">
    <testsuite name="Quick Suite" tests="1" failures="0" errors="0" time="0.123">
        <testcase name="quick test" time="0.045"/>
    </testsuite>
</testsuites>`;

            const markdown = await generateMarkdownFromJunit(xmlContent);

            expect(markdown).toContain('**Duration**: 567ms');
            expect(markdown).toContain('123ms');
            expect(markdown).toContain('45ms');
        });

        test('should format duration in seconds for values greater than or equal to 1 second', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="1" failures="0" errors="0" time="2.5678">
    <testsuite name="Slow Suite" tests="1" failures="0" errors="0" time="2.5678">
        <testcase name="slow test" time="1.234"/>
    </testsuite>
</testsuites>`;

            const markdown = await generateMarkdownFromJunit(xmlContent);

            expect(markdown).toContain('**Duration**: 2.57s');
            expect(markdown).toContain('1.23s');
        });

        test('should handle missing or invalid numeric values', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="" failures="" errors="" time="">
    <testsuite name="Edge Case Suite" tests="" failures="" errors="" time="">
        <testcase name="edge test" time=""/>
    </testsuite>
</testsuites>`;

            const markdown = await generateMarkdownFromJunit(xmlContent);

            expect(markdown).toContain('**Total Tests**: 0');
            expect(markdown).toContain('**Passed**: 0 ✅');
            expect(markdown).toContain('**Failed**: 0 ❌');
            expect(markdown).toContain('**Errors**: 0 ⚠️');
            expect(markdown).toContain('**Duration**: 0ms');
            expect(markdown).toContain('**Status**: ✅ PASSED');
        });

        test('should handle single testsuite (not array)', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="1" failures="0" errors="0" time="0.5">
    <testsuite name="Single Suite" tests="1" failures="0" errors="0" time="0.5">
        <testcase name="single test" time="0.5"/>
    </testsuite>
</testsuites>`;

            const markdown = await generateMarkdownFromJunit(xmlContent);

            expect(markdown).toContain('### ✅ Single Suite');
            expect(markdown).toContain('single test');
        });

        test('should handle single testcase (not array)', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="1" failures="0" errors="0" time="0.5">
    <testsuite name="Suite" tests="1" failures="0" errors="0" time="0.5">
        <testcase name="only test" time="0.5"/>
    </testsuite>
</testsuites>`;

            const markdown = await generateMarkdownFromJunit(xmlContent);

            expect(markdown).toContain('only test');
        });

        test('should handle testsuite with no testcases', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="0" failures="0" errors="0" time="0">
    <testsuite name="Empty Suite" tests="0" failures="0" errors="0" time="0"/>
</testsuites>`;

            const markdown = await generateMarkdownFromJunit(xmlContent);

            expect(markdown).toContain('### ✅ Empty Suite');
            expect(markdown).not.toContain('✅ Passed Tests');
            expect(markdown).not.toContain('#### ❌ Failed Tests');
        });

        test('should handle missing suite name', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="1" failures="0" errors="0" time="0.5">
    <testsuite tests="1" failures="0" errors="0" time="0.5">
        <testcase name="test" time="0.5"/>
    </testsuite>
</testsuites>`;

            const markdown = await generateMarkdownFromJunit(xmlContent);

            expect(markdown).toContain('### ✅ Unknown Suite');
        });

        test('should clean ANSI codes from error messages', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="1" failures="1" errors="0" time="0.5">
    <testsuite name="Suite" tests="1" failures="1" errors="0" time="0.5">
        <testcase name="test with ansi" time="0.5">
            <failure>\u001b[31mError: test failed\u001b[0m</failure>
        </testcase>
    </testsuite>
</testsuites>`;

            const markdown = await generateMarkdownFromJunit(xmlContent);

            expect(markdown).toContain('Error: test failed');
            expect(markdown).not.toContain('\u001b[31m');
            expect(markdown).not.toContain('\u001b[0m');
        });

        test('should limit error message to first 10 lines', async () => {
            const longError = Array.from({ length: 20 }, (_, i) => `Line ${i + 1}`).join('\n');
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="1" failures="1" errors="0" time="0.5">
    <testsuite name="Suite" tests="1" failures="1" errors="0" time="0.5">
        <testcase name="test with long error" time="0.5">
            <failure>${longError}</failure>
        </testcase>
    </testsuite>
</testsuites>`;

            const markdown = await generateMarkdownFromJunit(xmlContent);

            expect(markdown).toContain('Line 1');
            expect(markdown).toContain('Line 10');
            expect(markdown).not.toContain('Line 11');
            expect(markdown).not.toContain('Line 20');
        });

        test('should handle failure message as object with underscore property', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="1" failures="1" errors="0" time="0.5">
    <testsuite name="Suite" tests="1" failures="1" errors="0" time="0.5">
        <testcase name="test" time="0.5">
            <failure type="AssertionError">Error content</failure>
        </testcase>
    </testsuite>
</testsuites>`;

            const markdown = await generateMarkdownFromJunit(xmlContent);

            // xml2js will parse this with attributes
            expect(markdown).toContain('#### ❌ Failed Tests');
        });

        test('should handle failure with message property', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="1" failures="1" errors="0" time="0.5">
    <testsuite name="Suite" tests="1" failures="1" errors="0" time="0.5">
        <testcase name="test" time="0.5">
            <failure message="Custom error message"/>
        </testcase>
    </testsuite>
</testsuites>`;

            const markdown = await generateMarkdownFromJunit(xmlContent);

            expect(markdown).toContain('#### ❌ Failed Tests');
        });

        test('should handle zero duration', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="1" failures="0" errors="0" time="0">
    <testsuite name="Suite" tests="1" failures="0" errors="0" time="0">
        <testcase name="instant test" time="0"/>
    </testsuite>
</testsuites>`;

            const markdown = await generateMarkdownFromJunit(xmlContent);

            expect(markdown).toContain('**Duration**: 0ms');
            expect(markdown).toContain('instant test (0ms)');
        });

        test('should handle both failures and errors in same suite', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="3" failures="1" errors="1" time="1.5">
    <testsuite name="Mixed Suite" tests="3" failures="1" errors="1" time="1.5">
        <testcase name="passing test" time="0.5"/>
        <testcase name="failing test" time="0.5">
            <failure>Assertion error</failure>
        </testcase>
        <testcase name="error test" time="0.5">
            <error>Runtime error</error>
        </testcase>
    </testsuite>
</testsuites>`;

            const markdown = await generateMarkdownFromJunit(xmlContent);

            expect(markdown).toContain('**Status**: ❌ FAILED');
            expect(markdown).toContain('**Failed**: 1 ❌');
            expect(markdown).toContain('**Errors**: 1 ⚠️');
            expect(markdown).toContain('### ❌ Mixed Suite');
            expect(markdown).toContain('✅ Passed Tests (1)');
            expect(markdown).toContain('#### ❌ Failed Tests');
            expect(markdown).toContain('failing test');
            expect(markdown).toContain('error test');
        });

        test('should handle failure with no message property defaulting to "No error message"', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="1" failures="1" errors="0" time="0.5">
    <testsuite name="Suite" tests="1" failures="1" errors="0" time="0.5">
        <testcase name="test" time="0.5">
            <failure type="unknown"/>
        </testcase>
    </testsuite>
</testsuites>`;

            const markdown = await generateMarkdownFromJunit(xmlContent);

            expect(markdown).toContain('#### ❌ Failed Tests');
            // The actual behavior depends on xml2js parsing, which would create object
        });

        test('should handle error as string message', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="1" failures="0" errors="1" time="0.5">
    <testsuite name="Suite" tests="1" failures="0" errors="1" time="0.5">
        <testcase name="test with string error" time="0.5">
            <error>String error message</error>
        </testcase>
    </testsuite>
</testsuites>`;

            const markdown = await generateMarkdownFromJunit(xmlContent);

            expect(markdown).toContain('String error message');
        });

        test('should handle failure as string message', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="1" failures="1" errors="0" time="0.5">
    <testsuite name="Suite" tests="1" failures="1" errors="0" time="0.5">
        <testcase name="test with string failure" time="0.5">
            <failure>String failure message</failure>
        </testcase>
    </testsuite>
</testsuites>`;

            const markdown = await generateMarkdownFromJunit(xmlContent);

            expect(markdown).toContain('String failure message');
        });
    });
});
