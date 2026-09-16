import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaDirectory = path.resolve(here, '..', 'schemas');
const commonSchema = JSON.parse(fs.readFileSync(path.join(schemaDirectory, 'common.schema.json'), 'utf8'));
const architectureSchema = JSON.parse(fs.readFileSync(path.join(schemaDirectory, 'architecture.schema.json'), 'utf8'));

const ajv = new Ajv2020({ allErrors: true, strict: false });
ajv.addSchema(commonSchema);
const validate = ajv.compile(architectureSchema);

export function validateArchitecture(document) {
  if (validate(document)) return [];
  return (validate.errors || []).map((error) => ({
    path: error.instancePath || '/',
    keyword: error.keyword,
    message: error.message || 'schema validation failed',
    params: error.params,
  }));
}
