/**
 * Generate a markdown test report from JUnit XML, with optional appended sections.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { generateMarkdownFromJunit } from '@chauhaidang/xq-common-kit';

export interface GenerateTestReportOptions {
  /** Path to the JUnit XML file (e.g. from jest-junit). */
  junitXmlPath: string;
  /** Path where the markdown report will be written. */
  reportMdPath: string;
  /** Optional markdown to append after the generated report (e.g. test-detail tables). */
  appendMarkdown?: string;
}

/**
 * Reads JUnit XML from the given path, converts it to markdown via generateMarkdownFromJunit,
 * optionally appends extra markdown, and writes the result to reportMdPath.
 */
export async function generateTestReport(options: GenerateTestReportOptions): Promise<void> {
  const { junitXmlPath, reportMdPath, appendMarkdown } = options;
  const xmlContent = readFileSync(junitXmlPath, 'utf8');
  const markdown = await generateMarkdownFromJunit(xmlContent);
  const fullContent = appendMarkdown ? markdown + '\n\n' + appendMarkdown : markdown;
  writeFileSync(reportMdPath, fullContent);
}
