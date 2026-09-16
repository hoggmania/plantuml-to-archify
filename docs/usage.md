# Installation and CLI usage

## Requirements

- Node.js 18 or newer
- npm
- Archify only if you want composition validation or interactive HTML delivery

## Install from source

```bash
git clone https://github.com/hoggmania/plantuml-to-archify.git
cd plantuml-to-archify
npm ci
```

## Convert a diagram

```bash
node bin/puml2archify.mjs input.puml output.architecture.json
```

When the output path is omitted, the CLI writes `<input>.architecture.json` next to the input file.

## Options

| Option | Meaning |
|---|---|
| `--title <text>` | Override the PlantUML `title`. |
| `--quality standard\|showcase` | Set `meta.quality_profile`; defaults to `showcase`. |
| `--strict` | Fail if any unsupported statement produces a warning. |
| `--json` | Print a machine-readable receipt. |
| `-h`, `--help` | Show CLI help. |

Example:

```bash
node bin/puml2archify.mjs system.puml system.architecture.json \
  --quality standard \
  --strict \
  --json
```

## Receipt

```json
{
  "ok": true,
  "command": "transpile",
  "input": "/project/system.puml",
  "output": "/project/system.architecture.json",
  "type": "architecture",
  "components": 6,
  "boundaries": 1,
  "connections": 5,
  "warnings": []
}
```

## Use as a JavaScript module

```js
import { readFile } from 'node:fs/promises';
import { transpilePlantUml } from 'plantuml-to-archify';

const source = await readFile('system.puml', 'utf8');
const { document, warnings } = transpilePlantUml(source, {
  quality: 'standard',
});
```

## Validate and deliver with Archify

The local schema check proves structural validity. Archify's validator additionally checks rendering and composition:

```bash
node /path/to/archify/bin/archify.mjs validate architecture system.architecture.json \
  --quality standard \
  --json

node /path/to/archify/bin/archify.mjs deliver architecture system.architecture.json \
  system.html \
  --quality standard \
  --json
```

Do not treat schema validity as visual approval. Dense diagrams may require manual layout repair before delivery.
