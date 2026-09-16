const C4_BOUNDARIES = new Set([
  'Boundary',
  'Enterprise_Boundary',
  'System_Boundary',
  'Container_Boundary',
  'Deployment_Node',
  'Node',
]);

const GENERIC_COMPONENT_TYPES = {
  actor: 'external',
  cloud: 'cloud',
  component: 'backend',
  database: 'database',
  entity: 'backend',
  file: 'database',
  folder: 'database',
  frame: 'backend',
  hexagon: 'backend',
  interface: 'frontend',
  node: 'backend',
  queue: 'messagebus',
  rectangle: 'backend',
  storage: 'database',
  usecase: 'frontend',
};

function stripComments(source) {
  const withoutBlocks = source.replace(/\/\*[\s\S]*?\*\//g, '');
  return withoutBlocks.split(/\r?\n/).map((line) => {
    let quoted = false;
    let escaped = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') quoted = !quoted;
      if (!quoted && char === "'") return line.slice(0, index);
    }
    return line;
  });
}

function logicalStatements(source) {
  const lines = stripComments(source);
  const statements = [];
  let buffer = '';
  let startLine = 0;
  let depth = 0;
  let quoted = false;
  let escaped = false;

  function scan(text) {
    for (const char of text) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        quoted = !quoted;
        continue;
      }
      if (!quoted && char === '(') depth += 1;
      if (!quoted && char === ')') depth -= 1;
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!buffer && !trimmed) continue;
    if (!buffer) startLine = index + 1;
    buffer = buffer ? `${buffer} ${trimmed}` : trimmed;
    scan(trimmed);
    if (depth <= 0 && !quoted) {
      statements.push({ text: buffer.trim(), line: startLine });
      buffer = '';
      depth = 0;
      escaped = false;
    }
  }
  if (buffer) statements.push({ text: buffer.trim(), line: startLine });
  return statements;
}

function splitArguments(text, line) {
  const args = [];
  let current = '';
  let quoted = false;
  let escaped = false;
  let nested = 0;
  for (const char of text) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === '\\' && quoted) {
      escaped = true;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && ['(', '[', '{'].includes(char)) nested += 1;
    if (!quoted && [')', ']', '}'].includes(char)) nested -= 1;
    if (!quoted && nested === 0 && char === ',') {
      args.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (quoted) throw new Error(`line ${line}: unterminated quoted argument`);
  args.push(current.trim());
  return args.map((arg) => arg.replace(/\\n/g, ' ').trim());
}

function normalizeId(alias) {
  let id = String(alias).trim().replace(/^['"]|['"]$/g, '');
  id = id.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/_+/g, '_');
  if (!/^[a-zA-Z]/.test(id)) id = `n_${id}`;
  return id || 'node';
}

function uniqueId(base, used) {
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

function joinDetails(...parts) {
  const values = parts.map((part) => String(part || '').trim()).filter(Boolean);
  return values.length ? values.join(' — ') : undefined;
}

function inferType(macro, label, technology, description, stereotype = '') {
  const name = macro.toLowerCase();
  const context = `${label} ${technology} ${description} ${stereotype}`.toLowerCase();
  if (name === 'actor' || name.includes('person') || name.endsWith('_ext') || stereotype.toLowerCase().includes('external')) return 'external';
  if (name === 'database' || name === 'storage' || name === 'file' || name === 'folder' || name.includes('db') || /\b(database|postgres|mysql|mariadb|mongo|redis|sql|storage|data store)\b/.test(context)) return 'database';
  if (name === 'queue' || name.includes('queue') || /\b(queue|kafka|rabbitmq|sqs|pubsub|message bus|event bus|topic)\b/.test(context)) return 'messagebus';
  if (/\b(security|policy|auth|identity|firewall|waf|gateway|vault|iam)\b/.test(context)) return 'security';
  if (name === 'cloud' || name.includes('system')) return 'cloud';
  if (name === 'interface' || name === 'usecase' || /\b(web|ui|frontend|browser|mobile|react|angular|vue|svelte)\b/.test(context)) return 'frontend';
  return GENERIC_COMPONENT_TYPES[name] || 'backend';
}

function parseGenericDeclaration(text) {
  const match = text.match(/^(actor|cloud|component|database|entity|file|folder|frame|hexagon|interface|node|queue|rectangle|storage|usecase)\s+(?:"((?:\\.|[^"])*)"\s+as\s+([^\s{]+)|([^\s\[]+)\s*\["((?:\\.|[^"])*)"\])(?:\s+<<([^>]+)>>)?\s*(\{)?$/i);
  if (!match) return null;
  return {
    kind: match[1].toLowerCase(),
    label: (match[2] ?? match[5]).replace(/\\"/g, '"'),
    alias: match[3] ?? match[4],
    stereotype: match[6] || '',
    opens: Boolean(match[7]),
  };
}

function parseGenericBoundary(text) {
  const match = text.match(/^(package|rectangle|frame|node|cloud)\s+"((?:\\.|[^"])*)"(?:\s+as\s+[^\s{]+)?(?:\s+<<([^>]+)>>)?\s*\{$/i);
  if (!match) return null;
  return { label: match[2].replace(/\\"/g, '"'), stereotype: match[3] || '' };
}

function parseArrow(text) {
  const match = text.match(/^([^\s]+)\s+([<]?(?:[-.]+)(?:\[[^\]]+\])?(?:[-.]+)[>]?)\s+([^\s:]+)(?:\s*:\s*(.*))?$/);
  if (!match) return null;
  let [, from, arrow, to, label = ''] = match;
  if (arrow.startsWith('<') && !arrow.endsWith('>')) [from, to] = [to, from];
  return { from, to, label: label.trim(), dashed: arrow.includes('.') };
}

function assignGrid(components, connections) {
  const indegree = new Map(components.map((component) => [component.id, 0]));
  const outgoing = new Map(components.map((component) => [component.id, []]));
  for (const connection of connections) {
    indegree.set(connection.to, (indegree.get(connection.to) || 0) + 1);
    outgoing.get(connection.from)?.push(connection.to);
  }

  const level = new Map(components.map((component) => [component.id, 0]));
  const queue = components.filter((component) => indegree.get(component.id) === 0).map((component) => component.id);
  const visited = new Set();
  while (queue.length) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    for (const target of outgoing.get(id) || []) {
      level.set(target, Math.max(level.get(target) || 0, (level.get(id) || 0) + 1));
      indegree.set(target, indegree.get(target) - 1);
      if (indegree.get(target) === 0) queue.push(target);
    }
  }

  const maxColumns = 12;
  const rowsByColumn = new Map();
  for (const component of components) {
    const col = Math.min(level.get(component.id) || 0, maxColumns - 1);
    const row = rowsByColumn.get(col) || 0;
    component.col = col;
    component.row = row;
    rowsByColumn.set(col, row + 1);
  }
  const cols = Math.max(1, ...components.map((component) => component.col + 1));
  return {
    mode: 'grid',
    origin: [60, 110],
    cols,
    gapX: 55,
    gapY: 45,
    cellW: 180,
    cellH: 84,
  };
}

export function transpilePlantUml(source, options = {}) {
  if (typeof source !== 'string') throw new TypeError('PlantUML source must be a string');
  const quality = options.quality || 'showcase';
  if (!['standard', 'showcase'].includes(quality)) {
    throw new Error(`quality must be standard or showcase, received "${quality}"`);
  }

  const components = [];
  const boundaries = [];
  const connections = [];
  const warnings = [];
  const aliases = new Map();
  const componentIds = new Set();
  const connectionIds = new Set();
  const boundaryStack = [];
  const pendingRelationships = [];
  let sourceName = '';
  let title = options.title || '';

  function addComponent({ alias, label, type, sublabel, line }) {
    if (!alias) throw new Error(`line ${line}: component alias is required`);
    if (aliases.has(alias)) throw new Error(`line ${line}: duplicate component alias "${alias}"`);
    const id = uniqueId(normalizeId(alias), componentIds);
    aliases.set(alias, id);
    const entry = { id, type, label: label || alias };
    if (sublabel) entry.sublabel = sublabel;
    components.push(entry);
    for (const boundary of boundaryStack) boundary.wraps.push(id);
  }

  function openBoundary(label, kind = 'region') {
    const boundary = { kind, label, wraps: [] };
    boundaries.push(boundary);
    boundaryStack.push(boundary);
  }

  for (const statement of logicalStatements(source)) {
    const { text, line } = statement;
    if (!text) continue;
    if (/^@enduml\b/i.test(text)) continue;
    const start = text.match(/^@startuml(?:\s+(.+))?$/i);
    if (start) {
      sourceName = (start[1] || '').trim();
      continue;
    }
    const titleMatch = text.match(/^title\s+(.+)$/i);
    if (titleMatch) {
      title ||= titleMatch[1].trim().replace(/^"|"$/g, '');
      continue;
    }
    if (/^(?:!|skinparam\b|hide\b|show\b|left to right direction\b|top to bottom direction\b|LAYOUT_|AddElementTag\b|AddRelTag\b)/i.test(text)) continue;
    if (text === '}') {
      if (boundaryStack.length) boundaryStack.pop();
      else warnings.push({ line, message: 'unmatched closing boundary brace ignored' });
      continue;
    }

    const c4 = text.match(/^([A-Za-z][A-Za-z0-9_]*)\s*\((.*)\)\s*(\{)?$/);
    if (c4) {
      const macro = c4[1];
      const args = splitArguments(c4[2], line);
      if (C4_BOUNDARIES.has(macro) || /_Boundary$/.test(macro)) {
        if (args.length < 2) throw new Error(`line ${line}: ${macro} requires an alias and label`);
        openBoundary(args[1], /security/i.test(`${macro} ${args.slice(2).join(' ')}`) ? 'security-group' : 'region');
        continue;
      }
      if (/^(?:Bi)?Rel(?:_|$)/.test(macro)) {
        if (args.length < 2) throw new Error(`line ${line}: ${macro} requires source and target aliases`);
        pendingRelationships.push({
          from: args[0], to: args[1], label: joinDetails(args[2], args[3]), line,
        });
        if (macro.startsWith('BiRel')) {
          pendingRelationships.push({
            from: args[1], to: args[0], label: joinDetails(args[2], args[3]), line,
          });
        }
        continue;
      }
      if (/^(?:Person|System|Container|Component)/.test(macro)) {
        if (args.length < 2) throw new Error(`line ${line}: ${macro} requires an alias and label`);
        const technology = /^(?:Container|Component)/.test(macro) ? args[2] : '';
        const description = /^(?:Container|Component)/.test(macro) ? args[3] : args[2];
        addComponent({
          alias: args[0],
          label: args[1],
          type: inferType(macro, args[1], technology, description),
          sublabel: joinDetails(technology, description),
          line,
        });
        continue;
      }
    }

    const boundary = parseGenericBoundary(text);
    const declaration = parseGenericDeclaration(text);
    if (boundary && (!declaration || ['package', 'rectangle', 'frame', 'node', 'cloud'].includes(text.split(/\s+/)[0].toLowerCase()))) {
      openBoundary(boundary.label, /security/i.test(boundary.stereotype) ? 'security-group' : 'region');
      continue;
    }
    if (declaration) {
      addComponent({
        alias: declaration.alias,
        label: declaration.label,
        type: inferType(declaration.kind, declaration.label, '', '', declaration.stereotype)
          || GENERIC_COMPONENT_TYPES[declaration.kind],
        line,
      });
      continue;
    }
    const arrow = parseArrow(text);
    if (arrow) {
      pendingRelationships.push({ ...arrow, line });
      continue;
    }
    warnings.push({ line, message: `unsupported PlantUML statement ignored: ${text}` });
  }

  if (!components.length) throw new Error('PlantUML input contains no supported components');
  for (const relationship of pendingRelationships) {
    const from = aliases.get(relationship.from);
    const to = aliases.get(relationship.to);
    if (!from) throw new Error(`line ${relationship.line}: relationship endpoint "${relationship.from}" is not declared`);
    if (!to) throw new Error(`line ${relationship.line}: relationship endpoint "${relationship.to}" is not declared`);
    const base = `${from}-to-${to}`;
    const entry = {
      id: uniqueId(base, connectionIds),
      from,
      to,
    };
    if (relationship.label) entry.label = relationship.label;
    if (relationship.dashed) entry.variant = 'dashed';
    connections.push(entry);
  }

  const layout = assignGrid(components, connections);
  const document = {
    schema_version: 1,
    diagram_type: 'architecture',
    meta: {
      title: title || sourceName || options.fallbackTitle || 'Imported PlantUML diagram',
      quality_profile: quality,
    },
    layout,
    components,
  };
  const nonEmptyBoundaries = boundaries.filter((boundary) => boundary.wraps.length);
  if (nonEmptyBoundaries.length) document.boundaries = nonEmptyBoundaries;
  if (connections.length) document.connections = connections;

  return { document, warnings };
}
