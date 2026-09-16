#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { transpilePlantUml } from '../src/plantuml.mjs';
import { validateArchitecture } from '../src/validate.mjs';

function usage() {
  return `Usage:
  puml2archify <input.puml> [output.architecture.json]
    [--title <text>] [--quality standard|showcase] [--strict] [--json]

Options:
  --title       Override the PlantUML title.
  --quality     Set the Archify quality profile (default: showcase).
  --strict      Fail when unsupported PlantUML statements produce warnings.
  --json        Print a machine-readable receipt.
  -h, --help    Show this help.
`;
}

function fail(message, json = false) {
  if (json) {
    console.error(JSON.stringify({ ok: false, error: message }, null, 2));
  } else {
    console.error(message);
  }
  process.exit(2);
}

function parseArguments(args) {
  const positional = [];
  const options = { quality: 'showcase', strict: false, json: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '-h' || arg === '--help') return { help: true };
    if (arg === '--strict') {
      options.strict = true;
      continue;
    }
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--title' || arg === '--quality') {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) fail(`${arg} requires a value.`, options.json);
      options[arg.slice(2)] = value;
      index += 1;
      continue;
    }
    if (arg.startsWith('--title=')) {
      options.title = arg.slice('--title='.length);
      continue;
    }
    if (arg.startsWith('--quality=')) {
      options.quality = arg.slice('--quality='.length);
      continue;
    }
    if (arg.startsWith('-')) fail(`Unknown option "${arg}".`, options.json);
    positional.push(arg);
  }
  return { positional, options };
}

const parsed = parseArguments(process.argv.slice(2));
if (parsed.help) {
  console.log(usage());
  process.exit(0);
}
const { positional, options } = parsed;
if (positional.length < 1 || positional.length > 2) fail(usage(), options.json);
if (!['standard', 'showcase'].includes(options.quality)) {
  fail(`Unknown quality profile "${options.quality}". Expected standard or showcase.`, options.json);
}

const input = path.resolve(positional[0]);
const output = path.resolve(positional[1] || path.join(
  path.dirname(input),
  `${path.basename(input, path.extname(input))}.architecture.json`,
));

let source;
try {
  source = fs.readFileSync(input, 'utf8');
} catch (error) {
  fail(`PlantUML input could not be read: ${error.message}`, options.json);
}

let result;
try {
  result = transpilePlantUml(source, {
    ...(options.title ? { title: options.title } : {}),
    quality: options.quality,
    fallbackTitle: path.basename(input, path.extname(input)),
  });
} catch (error) {
  fail(`PlantUML import failed: ${error.message}`, options.json);
}

if (options.strict && result.warnings.length) {
  fail(`Strict import rejected ${result.warnings.length} unsupported statement warning(s).`, options.json);
}
const schemaErrors = validateArchitecture(result.document);
if (schemaErrors.length) {
  fail(`Generated output failed Archify schema validation: ${schemaErrors.map((error) => `${error.path} ${error.message}`).join('; ')}`, options.json);
}

fs.mkdirSync(path.dirname(output), { recursive: true });
const temporary = `${output}.${process.pid}.tmp`;
try {
  fs.writeFileSync(temporary, `${JSON.stringify(result.document, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, output);
} finally {
  fs.rmSync(temporary, { force: true });
}

const receipt = {
  ok: true,
  command: 'transpile',
  input,
  output,
  type: 'architecture',
  components: result.document.components.length,
  boundaries: result.document.boundaries?.length || 0,
  connections: result.document.connections?.length || 0,
  warnings: result.warnings,
};
if (options.json) {
  console.log(JSON.stringify(receipt, null, 2));
} else {
  console.log(`Wrote ${output}`);
  console.log(`${receipt.components} components, ${receipt.boundaries} boundaries, ${receipt.connections} connections, ${receipt.warnings.length} warnings`);
  for (const warning of receipt.warnings) {
    console.error(`warning line ${warning.line}: ${warning.message}`);
  }
}
