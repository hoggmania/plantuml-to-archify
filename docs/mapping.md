# PlantUML-to-Archify mapping

## C4 elements

| PlantUML/C4 input | Archify component type | Notes |
|---|---|---|
| `Person`, `Person_Ext` | `external` | Description becomes the sublabel. |
| `System` | `cloud` | Represents a system-level component. |
| `System_Ext` | `external` | External system boundary is preserved semantically. |
| `Container`, `Component` | inferred | UI technologies become `frontend`; most services become `backend`. |
| `*Db` | `database` | Includes container, component, and system database variants. |
| `*Queue` | `messagebus` | Includes Kafka, RabbitMQ, SQS, topics, and queues. |
| Security/policy/auth elements | `security` | Inferred from names, technology, descriptions, or stereotypes. |

Technology and description fields are joined into the Archify `sublabel` with an em dash.

## Generic PlantUML elements

| PlantUML input | Archify component type |
|---|---|
| `actor` | `external` |
| `cloud` | `cloud` |
| `component`, `node`, `entity` | `backend` unless inferred otherwise |
| `database`, `storage`, `file`, `folder` | `database` |
| `queue` | `messagebus` |
| `interface`, `usecase` | `frontend` |
| `<<security>>` or security terminology | `security` |

## Boundaries

C4 `System_Boundary`, `Container_Boundary`, `Enterprise_Boundary`, deployment nodes, and generic PlantUML `package`, `frame`, `node`, `cloud`, or `rectangle` blocks become Archify boundaries.

- Ordinary boundaries map to `region`.
- Security-labelled boundaries map to `security-group`.
- Nested component membership is preserved in each active boundary's `wraps` list.
- Empty boundaries are omitted because Archify requires at least one wrapped component.

## Relationships

- `Rel` and directional `Rel_*` macros become directed Archify connections.
- `BiRel` produces one connection in each direction.
- The relationship label and technology/protocol are joined with an em dash.
- Solid PlantUML arrows become default connections.
- Dotted arrows become `variant: "dashed"`.
- Repeated endpoint pairs receive stable IDs such as `api-to-db` and `api-to-db-2`.

PlantUML layout suffixes such as `_R` or `_D` are not copied as Archify routing instructions. They describe the source renderer's geometry, not the semantic relationship.

## Layout

The transpiler computes graph levels from relationship direction and assigns each component to an Archify grid column. Components at the same level are assigned successive rows. Cyclic or disconnected components remain valid and receive deterministic fallback positions.

This provides a useful starting composition, not a promise of final visual polish.
