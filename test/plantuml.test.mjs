import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transpilePlantUml } from '../src/plantuml.mjs';
import { validateArchitecture } from '../src/validate.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const cli = path.join(root, 'bin', 'puml2archify.mjs');

function component(document, id) {
  return document.components.find((entry) => entry.id === id);
}

test('converts C4 elements, boundaries, relationships, and types', () => {
  const source = fs.readFileSync(path.join(root, 'examples', 'c4-container.puml'), 'utf8');
  const { document, warnings } = transpilePlantUml(source, { quality: 'standard' });

  assert.equal(document.meta.title, 'Checkout Platform');
  assert.equal(component(document, 'customer').type, 'external');
  assert.equal(component(document, 'web').type, 'frontend');
  assert.equal(component(document, 'api').type, 'backend');
  assert.equal(component(document, 'db').type, 'database');
  assert.equal(component(document, 'events').type, 'messagebus');
  assert.deepEqual(document.boundaries, [{
    kind: 'region', label: 'Checkout Platform', wraps: ['web', 'api', 'events', 'db'],
  }]);
  assert.equal(document.connections.length, 5);
  assert.deepEqual(validateArchitecture(document), []);
  assert.deepEqual(warnings, []);
});

test('converts generic PlantUML declarations and dashed arrows', () => {
  const source = `
@startuml
actor "Operator" as user
cloud "Edge" as edge
component "API" as api
database "Main DB" as db
queue "Jobs" as jobs
package "Private Network" {
  node "Worker" as worker
  component "Policy Engine" as policy <<security>>
}
user --> edge : HTTPS
edge --> api
api --> db : SQL
api ..> jobs : enqueue
jobs --> worker
worker --> policy
@enduml
`;
  const { document } = transpilePlantUml(source);

  assert.equal(component(document, 'user').type, 'external');
  assert.equal(component(document, 'edge').type, 'cloud');
  assert.equal(component(document, 'policy').type, 'security');
  assert.equal(document.connections[3].variant, 'dashed');
  assert.deepEqual(validateArchitecture(document), []);
});

test('normalizes IDs and fails closed for unresolved endpoints', () => {
  const valid = transpilePlantUml(`
@startuml
component "API" as api.service
component "DB" as 123-db
api.service --> 123-db : query
api.service --> 123-db : retry
@enduml
`, { title: 'IDs' }).document;
  assert.deepEqual(valid.components.map((entry) => entry.id), ['api_service', 'n_123-db']);
  assert.deepEqual(valid.connections.map((entry) => entry.id), [
    'api_service-to-n_123-db', 'api_service-to-n_123-db-2',
  ]);
  assert.throws(() => transpilePlantUml(`
@startuml
component "API" as api
api --> missing
@enduml
`), /relationship endpoint "missing" is not declared/);
});

test('CLI writes schema-valid JSON and a machine receipt', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'puml2archify-'));
  const output = path.join(tmp, 'diagram.architecture.json');
  const result = spawnSync(process.execPath, [
    cli,
    path.join(root, 'examples', 'c4-container.puml'),
    output,
    '--quality', 'standard',
    '--json',
  ], { cwd: root, encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(result.stdout);
  const document = JSON.parse(fs.readFileSync(output, 'utf8'));
  assert.equal(receipt.ok, true);
  assert.equal(receipt.components, 6);
  assert.equal(receipt.connections, 5);
  assert.deepEqual(validateArchitecture(document), []);
});

test('strict mode rejects unsupported statements without writing output', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'puml2archify-strict-'));
  const input = path.join(tmp, 'unsupported.puml');
  const output = path.join(tmp, 'output.json');
  fs.writeFileSync(input, '@startuml\ncomponent "API" as api\nnote right of api: ignored\n@enduml\n');
  const result = spawnSync(process.execPath, [cli, input, output, '--strict'], {
    cwd: root,
    encoding: 'utf8',
  });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Strict import rejected 1 unsupported statement warning/);
  assert.equal(fs.existsSync(output), false);
});
