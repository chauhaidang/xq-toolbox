/**
 * Unit tests for JunitMarkdownReporter and generateTestReport
 */

import { JunitMarkdownReporter, generateTestReport } from '../reporting/junit-markdown-reporter';

// ---------- mock fs ----------
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();

jest.mock('node:fs', () => ({
    readFileSync: (...args: any[]) => mockReadFileSync(...args),
    writeFileSync: (...args: any[]) => mockWriteFileSync(...args),
}));

// ---------- mock xq-common-kit ----------
const mockGenerateMarkdownFromJunit = jest.fn();

jest.mock('@chauhaidang/xq-common-kit', () => ({
    generateMarkdownFromJunit: (...args: any[]) => mockGenerateMarkdownFromJunit(...args),
}));

describe('JunitMarkdownReporter', () => {
    const sampleXml = '<testsuites><testsuite name="suite1" tests="1"><testcase name="test1"/></testsuite></testsuites>';
    const generatedMd = '# Test Report\n\n| Test | Status |\n|---|---|\n| test1 | ✅ |';

    beforeEach(() => {
        jest.clearAllMocks();
        mockReadFileSync.mockReturnValue(sampleXml);
        mockGenerateMarkdownFromJunit.mockResolvedValue(generatedMd);
    });

    describe('generate()', () => {
        it('should read XML, convert to markdown, and write the report', async () => {
            const reporter = new JunitMarkdownReporter();

            await reporter.generate({
                junitXmlPath: '/path/to/junit.xml',
                reportMdPath: '/path/to/report.md',
            });

            expect(mockReadFileSync).toHaveBeenCalledWith('/path/to/junit.xml', 'utf8');
            expect(mockGenerateMarkdownFromJunit).toHaveBeenCalledWith(sampleXml);
            expect(mockWriteFileSync).toHaveBeenCalledWith('/path/to/report.md', generatedMd);
        });

        it('should append extra markdown when provided', async () => {
            const reporter = new JunitMarkdownReporter();
            const extra = '## Coverage\n\n95%';

            await reporter.generate({
                junitXmlPath: '/path/to/junit.xml',
                reportMdPath: '/path/to/report.md',
                appendMarkdown: extra,
            });

            expect(mockWriteFileSync).toHaveBeenCalledWith(
                '/path/to/report.md',
                generatedMd + '\n\n' + extra
            );
        });
    });
});

describe('generateTestReport', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockReadFileSync.mockReturnValue('<testsuites/>');
        mockGenerateMarkdownFromJunit.mockResolvedValue('# Report');
    });

    it('should be a convenience function that delegates to JunitMarkdownReporter', async () => {
        await generateTestReport({
            junitXmlPath: '/a.xml',
            reportMdPath: '/a.md',
        });

        expect(mockReadFileSync).toHaveBeenCalledWith('/a.xml', 'utf8');
        expect(mockWriteFileSync).toHaveBeenCalledWith('/a.md', '# Report');
    });
});
