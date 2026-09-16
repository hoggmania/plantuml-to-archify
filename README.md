# PlantUML to Archify

[![CI](https://github.com/hoggmania/plantuml-to-archify/actions/workflows/ci.yml/badge.svg)](https://github.com/hoggmania/plantuml-to-archify/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A deterministic transpiler for converting **C4-PlantUML** and ordinary PlantUML component diagrams into schema-valid [Archify](https://github.com/tt-a1i/archify) architecture JSON.

It preserves components, boundaries, relationships, labels, technologies, and a topology-aware grid. It deliberately does not pretend PlantUML and Archify have the same visual model: skin parameters, sprites, notes, and exact Graphviz/Smetana coordinates are reported or ignored rather than fabricated.

## Quick start

```bash
git clone https://github.com/hoggmania/plantuml-to-archify.git
cd plantuml-to-archify
npm ci
node bin/puml2archify.mjs examples/c4-container.puml output.architecture.json --quality standard --json
```

Validate and render the result with Archify:

```bash
node /path/to/archify/bin/archify.mjs validate architecture output.architecture.json --quality standard --json
node /path/to/archify/bin/archify.mjs deliver architecture output.architecture.json output.html --quality standard --json
```

## Supported input

- C4: `Person`, `System`, `Container`, `Component`, database, queue, and external variants
- C4 boundaries: system, container, enterprise, deployment, and custom boundary macros
- C4 relationships: `Rel`, directional `Rel_*`, and `BiRel`
- PlantUML: `actor`, `component`, `database`, `queue`, `cloud`, `node`, `package`, and common arrows
- Nested boundary membership, stable ID normalization, duplicate connection IDs, and multiline C4 calls

The output is currently **Archify `architecture` JSON only**. Sequence, activity, class, and state diagrams are intentionally outside the current scope.

## Safety behavior

- Generated JSON is checked against the bundled Archify architecture schema before it is written.
- Unresolved relationship endpoints fail closed.
- `--strict` turns unsupported-statement warnings into a failed import.
- Output is written atomically, so a failed conversion does not replace an existing artifact.

## Documentation

- [Documentation site](https://hoggmania.github.io/plantuml-to-archify/)
- [Interactive conversion demo](https://hoggmania.github.io/plantuml-to-archify/demo.html)
- [Installation and CLI usage](docs/usage.md)
- [PlantUML-to-Archify mapping](docs/mapping.md)
- [Limitations and design decisions](docs/limitations.md)
- [Agent skill](SKILL.md)

## Development

```bash
npm ci
npm run check
npm test
```

The test suite covers C4 input, generic PlantUML component diagrams, type inference, stable identifiers, strict mode, schema validation, and the CLI.

## License

MIT. The bundled Archify schema files retain their upstream MIT attribution in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
