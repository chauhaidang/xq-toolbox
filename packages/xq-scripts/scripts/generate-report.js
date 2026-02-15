#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');

program
    .option('--xml <path>', 'Path to JUnit XML file')
    .option('--output <path>', 'Path to output HTML file')
    .parse(process.argv);

const options = program.opts();

if (!options.xml || !options.output) {
    console.error('Error: --xml and --output arguments are required');
    process.exit(1);
}

try {
    // Read the template HTML
    // Assuming this script is run from project root or we can find the reporter package
    // Adjust path finding logic as needed. Here we assume standard monorepo structure.
    const reporterPath = path.resolve(__dirname, 'report-template.html');

    if (!fs.existsSync(reporterPath)) {
        throw new Error(`Reporter template not found at ${reporterPath}`);
    }

    let htmlContent = fs.readFileSync(reporterPath, 'utf8');

    // Read the JUnit XML
    const xmlPath = path.resolve(process.cwd(), options.xml);
    if (!fs.existsSync(xmlPath)) {
        throw new Error(`XML file not found at ${xmlPath}`);
    }
    const xmlContent = fs.readFileSync(xmlPath, 'utf8');

    // Escape backticks and other risky characters for template literal
    const escapedXml = xmlContent
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$');

    // Inject data
    const injectionScript = `
    <script>
        window.xqTestReportData = \`${escapedXml}\`;
    </script>
    `;

    // Inject before the closing body tag
    const outputHtml = htmlContent.replace('</body>', `${injectionScript}</body>`);

    // Write output
    const outputPath = path.resolve(process.cwd(), options.output);
    fs.writeFileSync(outputPath, outputHtml);

    console.log(`Report generated successfully at ${outputPath}`);

} catch (error) {
    console.error('Failed to generate report:', error.message);
    process.exit(1);
}
