/**
 * Reporting interfaces and types.
 */

export interface GenerateTestReportOptions {
    /** Path to the JUnit XML file (e.g. from jest-junit). */
    junitXmlPath: string;
    /** Path where the markdown report will be written. */
    reportMdPath: string;
    /** Optional markdown to append after the generated report (e.g. test-detail tables). */
    appendMarkdown?: string;
}

/**
 * Strategy interface for test report generators.
 * Implement this to add new report formats (HTML, JSON, etc.).
 */
export interface ITestReporter {
    generate(options: GenerateTestReportOptions): Promise<void>;
}
