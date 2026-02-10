#!/usr/bin/env node

const fs = require('fs')
const { generateMarkdownFromJunit } = require('@chauhaidang/xq-js-common-kit')
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('Usage: node test-results-to-markdown.js <path-to-junit-xml>')
    process.exit(1)
  }

  const xmlPath = args[0]

  if (!fs.existsSync(xmlPath)) {
    console.error(`Error: File not found: ${xmlPath}`)
    process.exit(1)
  }

  try {
    const xmlContent = fs.readFileSync(xmlPath, 'utf8')
    const markdown = await generateMarkdownFromJunit(xmlContent)

    // Output to stdout so it can be captured
    console.log(markdown)
  } catch (error) {
    console.error(`Error processing test results: ${error.message}`)
    console.error(error.stack)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
