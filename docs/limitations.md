# Limitations and design decisions

## Architecture diagrams only

The current output type is Archify `architecture`. PlantUML sequence, activity, class, timing, mind-map, and state diagrams are not converted. Failing explicitly is better than silently flattening those semantics into the wrong Archify model.

## Semantics over source styling

The converter preserves architecture facts rather than renderer-specific presentation. It does not preserve:

- `skinparam` settings
- sprites or icons
- colors and fonts
- notes
- hidden layout links
- exact Graphviz or Smetana coordinates
- C4 `Lay_*` placement macros
- arbitrary user-defined macros

Unsupported statements appear as warnings. Use `--strict` in CI or regulated workflows so any unsupported statement fails the run.

## Type inference

Archify has a smaller component type vocabulary than PlantUML. The transpiler uses deterministic rules based on the source macro, stereotype, label, technology, and description. Review inferred `frontend`, `backend`, `cloud`, and `security` types when terminology is ambiguous.

## Layout is a starting point

The generated topology-aware grid is deliberately conservative. Complex graphs can still produce long labels, edge crossings, or dense boundary layouts. Run Archify's full validator and repair diagnosed composition issues before publishing an HTML artifact.

## Included schemas

The bundled Archify schemas provide local structural validation and make the CLI fail before writing invalid JSON. They do not bundle the Archify renderer and do not replace Archify's artifact and composition checks.

When Archify evolves its schema, this repository must update the vendored files and mapping tests together.

## Security behavior

- Input is parsed as text; PlantUML includes are not fetched or executed.
- The CLI performs no network requests.
- Output uses atomic replacement.
- Missing or unresolved endpoints fail closed.
- Warnings remain visible in human and JSON receipts.
