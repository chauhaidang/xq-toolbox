/**
 * JUnit XML → Markdown test reporter.
 *
 * Implements ITestReporter so it can be swapped with other
 * report formats (HTML, JSON, etc.) in the future.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { generateMarkdownFromJunit } from '@chauhaidang/xq-common-kit';
import { GenerateTestReportOptions, ITestReporter } from './types';

/**
 * Generates a Markdown report from JUnit XML output.
 */
export class JunitMarkdownReporter implements ITestReporter {
    async generate(options: GenerateTestReportOptions): Promise<void> {
        const { junitXmlPath, reportMdPath, appendMarkdown } = options;
        const xmlContent = readFileSync(junitXmlPath, 'utf8');
        const markdown = await generateMarkdownFromJunit(xmlContent);
        const fullContent = appendMarkdown ? markdown + '\n\n' + appendMarkdown : markdown;
        writeFileSync(reportMdPath, fullContent);
    }
}

/**
 * Convenience function preserving the original API.
 * Delegates to JunitMarkdownReporter under the hood.
 */
export async function generateTestReport(options: GenerateTestReportOptions): Promise<void> {
    const reporter = new JunitMarkdownReporter();
    await reporter.generate(options);
}
