# PlantUML to Archify

PlantUML to Archify converts C4-PlantUML and ordinary PlantUML component diagrams into schema-valid Archify architecture JSON.

## Start here

1. [Open the interactive generated diagram](demo.html)
2. [Install and run the CLI](usage.md)
3. [Review the element and relationship mapping](mapping.md)
4. [Understand the conversion boundaries](limitations.md)

## Why this exists

PlantUML is excellent diagram-as-code, while Archify produces validated, explorable standalone HTML. Their visual models are different. This project bridges the semantic layer—components, boundaries, relationships, labels, and technologies—without claiming that PlantUML geometry or styling can be preserved exactly.

## Minimal example

```bash
npm ci
node bin/puml2archify.mjs examples/c4-container.puml output.architecture.json --quality standard --json
```

A successful receipt reports the output path and counts for components, boundaries, connections, and warnings. Use `--strict` when unsupported statements must fail the conversion.

## Project links

- [GitHub repository](https://github.com/hoggmania/plantuml-to-archify)
- [Issue tracker](https://github.com/hoggmania/plantuml-to-archify/issues)
- [Archify](https://github.com/tt-a1i/archify)
- [C4-PlantUML](https://github.com/plantuml-stdlib/C4-PlantUML)
