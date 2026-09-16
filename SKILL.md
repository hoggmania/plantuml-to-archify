---
name: plantuml-to-archify
description: Convert PlantUML architecture diagrams to Archify JSON.
version: 0.1.0
author: James Holland (hoggmania), Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [PlantUML, C4, Archify, Diagrams]
    related_skills: []
---

# PlantUML to Archify

Convert C4-PlantUML or ordinary PlantUML component diagrams into schema-valid Archify architecture JSON. The transpiler preserves semantic topology, not PlantUML styling or exact layout.

## When to Use

- A `.puml` architecture or C4 diagram needs to become an interactive Archify artifact.
- Existing PlantUML components, boundaries, and relationships should seed Archify JSON.
- Don't use this for sequence, activity, class, or state diagrams; the current output type is `architecture` only.

## Prerequisites

- Node.js 18 or newer.
- The repository dependencies installed with `npm ci`.
- Archify itself is optional and required only for composition validation and HTML delivery.

## How to Run

Use `terminal` from the repository root:

```bash
node bin/puml2archify.mjs input.puml output.architecture.json --quality standard --json
```

Fail on any unsupported PlantUML statement:

```bash
node bin/puml2archify.mjs input.puml output.architecture.json --strict --json
```

## Procedure

1. Read the source `.puml` and confirm it is an architecture/component diagram.
2. Run the transpiler with `--json`; require `ok: true` and inspect every warning.
3. If loss is unacceptable, rerun with `--strict` and repair or remove unsupported statements.
4. Validate the generated JSON with Archify:

   ```bash
   node /path/to/archify/bin/archify.mjs validate architecture output.architecture.json --quality standard --json
   ```

5. Deliver HTML only after validation passes with zero composition errors.

## Pitfalls

- Styling, sprites, notes, and Graphviz/Smetana coordinates are not preserved.
- Unsupported statements warn by default; use `--strict` to fail closed.
- Schema validity does not guarantee a polished composition. Dense inputs may need layout repair in the generated Archify JSON.
- Unresolved relationship endpoints always fail; the transpiler never silently drops them.

## Verification

Run `npm run check && npm test`. For an end-to-end artifact, run the Archify `validate` and `deliver` commands against the generated JSON and require successful receipts.
