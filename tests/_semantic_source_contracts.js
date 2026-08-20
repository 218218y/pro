import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

function identifierName(node) {
  if (node?.type === 'Identifier' || node?.type === 'PrivateIdentifier' || node?.type === 'JSXIdentifier') {
    return node.name;
  }
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

function memberPath(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'ThisExpression') return 'this';
  if (node.type !== 'MemberExpression') return null;
  const object = memberPath(node.object);
  const property = node.computed
    ? node.property?.type === 'Literal'
      ? String(node.property.value)
      : null
    : identifierName(node.property);
  return object && property ? `${object}.${property}` : null;
}

function unwrapExpression(node) {
  let current = node;
  while (
    current &&
    (current.type === 'TSAsExpression' ||
      current.type === 'TSSatisfiesExpression' ||
      current.type === 'TSNonNullExpression' ||
      current.type === 'ChainExpression' ||
      current.type === 'ParenthesizedExpression')
  ) {
    current = current.expression;
  }
  return current;
}

function typeName(node) {
  if (!node) return null;
  switch (node.type) {
    case 'TSTypeAnnotation':
      return typeName(node.typeAnnotation);
    case 'TSTypeReference': {
      const base = memberPath(node.typeName) || identifierName(node.typeName);
      const params = node.typeArguments?.params || node.typeParameters?.params || [];
      return params.length ? `${base}<${params.map(typeName).join(',')}>` : base;
    }
    case 'TSUnionType':
      return node.types.map(typeName).sort().join('|');
    case 'TSParenthesizedType':
      return typeName(node.typeAnnotation);
    case 'TSTypeOperator':
      return `${node.operator || ''} ${typeName(node.typeAnnotation)}`.trim();
    case 'TSIntersectionType':
      return node.types.map(typeName).sort().join('&');
    case 'TSArrayType':
      return `${typeName(node.elementType)}[]`;
    case 'TSIndexedAccessType':
      return `${typeName(node.objectType)}[${typeName(node.indexType)}]`;
    case 'TSLiteralType':
      return node.literal?.type === 'Literal' ? JSON.stringify(node.literal.value) : null;
    case 'TSStringKeyword':
      return 'string';
    case 'TSNumberKeyword':
      return 'number';
    case 'TSBooleanKeyword':
      return 'boolean';
    case 'TSUnknownKeyword':
      return 'unknown';
    case 'TSAnyKeyword':
      return 'any';
    case 'TSVoidKeyword':
      return 'void';
    case 'TSUndefinedKeyword':
      return 'undefined';
    case 'TSNullKeyword':
      return 'null';
    case 'TSNeverKeyword':
      return 'never';
    case 'TSObjectKeyword':
      return 'object';
    case 'TSFunctionType': {
      const params = (node.params || []).map(param => {
        const target = param?.type === 'AssignmentPattern' ? param.left : param;
        const name = target?.type === 'Identifier' ? target.name : target?.type || 'arg';
        const optional = target?.optional === true || param?.type === 'AssignmentPattern';
        return `${name}${optional ? '?' : ''}:${typeName(target?.typeAnnotation)}`;
      });
      return `fn(${params.join(',')})->${typeName(node.returnType)}`;
    }
    case 'TSTypeLiteral': {
      const members = (node.members || [])
        .filter(member => member?.type === 'TSPropertySignature')
        .map(member => {
          const name = identifierName(member.key);
          return `${name}${member.optional === true ? '?' : ''}:${typeName(member.typeAnnotation)}`;
        });
      return `type{${members.join(';')}}`;
    }
    default:
      return node.type || null;
  }
}

function parse(source, fileName = 'semantic_source_contract.ts') {
  return createSourceFile(fileName, String(source || ''));
}

export function getInterfaceFact(source, interfaceName, fileName) {
  const sourceFile = parse(source, fileName);
  let declaration = null;
  walkAst(sourceFile, node => {
    if (!declaration && node?.type === 'TSInterfaceDeclaration' && node.id?.name === interfaceName) {
      declaration = node;
    }
  });
  if (!declaration) return null;
  return {
    name: interfaceName,
    extends: (declaration.extends || []).map(
      item => memberPath(item.expression) || identifierName(item.expression)
    ),
    properties: (declaration.body?.body || [])
      .filter(property => property?.type === 'TSPropertySignature')
      .map(property => ({
        name: identifierName(property.key),
        optional: property.optional === true,
        readonly: property.readonly === true,
        type: typeName(property.typeAnnotation),
      })),
  };
}

export function getInterfacePropertyFacts(source, interfaceName, fileName) {
  const sourceFile = parse(source, fileName);
  let declaration = null;
  walkAst(sourceFile, node => {
    if (!declaration && node?.type === 'TSInterfaceDeclaration' && node.id?.name === interfaceName) {
      declaration = node;
    }
  });
  if (!declaration) return null;
  return (declaration.body?.body || [])
    .filter(property => property?.type === 'TSPropertySignature')
    .map(property => ({
      name: identifierName(property.key),
      optional: property.optional === true,
      readonly: property.readonly === true,
      type: typeName(property.typeAnnotation),
    }));
}

export function getTypeAliasFact(source, typeNameValue, fileName) {
  const sourceFile = parse(source, fileName);
  let declaration = null;
  walkAst(sourceFile, node => {
    if (!declaration && node?.type === 'TSTypeAliasDeclaration' && node.id?.name === typeNameValue) {
      declaration = node;
    }
  });
  if (!declaration) return null;
  return {
    name: typeNameValue,
    type: typeName(declaration.typeAnnotation),
  };
}

export function getTypeLiteralPropertyFacts(source, typeNameValue, fileName) {
  const sourceFile = parse(source, fileName);
  let typeLiterals = null;
  walkAst(sourceFile, node => {
    if (typeLiterals || node?.type !== 'TSTypeAliasDeclaration' || node.id?.name !== typeNameValue) return;
    const annotation = node.typeAnnotation;
    if (annotation?.type === 'TSTypeLiteral') {
      typeLiterals = [annotation];
      return;
    }
    if (annotation?.type === 'TSIntersectionType') {
      const literals = (annotation.types || []).filter(type => type?.type === 'TSTypeLiteral');
      if (literals.length) typeLiterals = literals;
    }
  });
  if (!typeLiterals) return null;
  return typeLiterals
    .flatMap(literal => literal.members || [])
    .filter(property => property?.type === 'TSPropertySignature')
    .map(property => ({
      name: identifierName(property.key),
      optional: property.optional === true,
      readonly: property.readonly === true,
      type: typeName(property.typeAnnotation),
    }));
}

export function getVariableInitializerFact(source, variableName, fileName) {
  const sourceFile = parse(source, fileName);
  let fact = null;
  walkAst(sourceFile, node => {
    if (fact || node?.type !== 'VariableDeclarator' || node.id?.type !== 'Identifier') return;
    if (node.id.name !== variableName) return;
    fact = expressionFact(node.init);
  });
  return fact;
}

function functionLikeSignatureFact(node, name = null) {
  if (!node) return null;
  return {
    name,
    async: node.async === true,
    params: (node.params || []).map(parameter => {
      const param = unwrapExpression(parameter);
      if (param?.type === 'Identifier') {
        return {
          name: param.name,
          optional: param.optional === true,
          type: typeName(param.typeAnnotation),
        };
      }
      if (param?.type === 'AssignmentPattern' && param.left?.type === 'Identifier') {
        return {
          name: param.left.name,
          optional: true,
          type: typeName(param.left.typeAnnotation),
          default: expressionFact(param.right),
        };
      }
      return { name: param?.type || null, optional: false, type: null };
    }),
    returnType: typeName(node.returnType),
  };
}

export function getAssignedFunctionSignatureFact(source, targetPath, fileName) {
  const sourceFile = parse(source, fileName);
  let fact = null;
  walkAst(sourceFile, node => {
    if (fact || node?.type !== 'AssignmentExpression') return;
    const left = memberPath(node.left);
    if (left !== targetPath) return;
    const right = unwrapExpression(node.right);
    if (right?.type !== 'ArrowFunctionExpression' && right?.type !== 'FunctionExpression') return;
    fact = functionLikeSignatureFact(right, targetPath);
  });
  return fact;
}

export function getVariableFunctionSignatureFact(source, variableName, fileName) {
  const sourceFile = parse(source, fileName);
  let fact = null;
  walkAst(sourceFile, node => {
    if (fact || node?.type !== 'VariableDeclarator' || node.id?.type !== 'Identifier') return;
    if (node.id.name !== variableName) return;
    const init = unwrapExpression(node.init);
    if (init?.type !== 'ArrowFunctionExpression' && init?.type !== 'FunctionExpression') return;
    fact = functionLikeSignatureFact(init, variableName);
  });
  return fact;
}

export function getNamedFunctionLikeSignatureFact(source, functionName, fileName) {
  const sourceFile = parse(source, fileName);
  let declaration = null;
  walkAst(sourceFile, node => {
    if (declaration) return;
    if (node?.type === 'FunctionDeclaration' && node.id?.name === functionName) {
      declaration = node;
      return;
    }
    if (
      (node?.type === 'FunctionExpression' || node?.type === 'ArrowFunctionExpression') &&
      node.id?.name === functionName
    ) {
      declaration = node;
    }
  });
  if (!declaration) return null;
  return {
    name: functionName,
    async: declaration.async === true,
    params: (declaration.params || []).map(parameter => {
      const param = unwrapExpression(parameter);
      if (param?.type === 'Identifier') {
        return {
          name: param.name,
          optional: param.optional === true,
          type: typeName(param.typeAnnotation),
        };
      }
      if (param?.type === 'AssignmentPattern' && param.left?.type === 'Identifier') {
        return {
          name: param.left.name,
          optional: true,
          type: typeName(param.left.typeAnnotation),
        };
      }
      return { name: param?.type || null, optional: false, type: null };
    }),
    returnType: typeName(declaration.returnType),
  };
}
export function getFunctionSignatureFact(source, functionName, fileName) {
  const sourceFile = parse(source, fileName);
  let declaration = null;
  walkAst(sourceFile, node => {
    if (!declaration && node?.type === 'FunctionDeclaration' && node.id?.name === functionName)
      declaration = node;
  });
  if (!declaration) return null;
  return {
    name: functionName,
    async: declaration.async === true,
    params: (declaration.params || []).map(parameter => {
      const param = unwrapExpression(parameter);
      if (param?.type === 'Identifier') {
        return {
          name: param.name,
          optional: param.optional === true,
          type: typeName(param.typeAnnotation),
        };
      }
      if (param?.type === 'AssignmentPattern' && param.left?.type === 'Identifier') {
        return {
          name: param.left.name,
          optional: true,
          type: typeName(param.left.typeAnnotation),
        };
      }
      return { name: param?.type || null, optional: false, type: null };
    }),
    returnType: typeName(declaration.returnType),
  };
}

function literalFact(node) {
  if (node?.type !== 'Literal') return null;
  return { kind: 'literal', value: node.value };
}

export function expressionFact(rawNode) {
  const node = unwrapExpression(rawNode);
  if (!node) return { kind: 'missing' };
  const literal = literalFact(node);
  if (literal) return literal;
  if (node.type === 'Identifier') return { kind: 'identifier', name: node.name };
  if (node.type === 'MemberExpression') return { kind: 'member', path: memberPath(node) };
  if (node.type === 'UnaryExpression') {
    return { kind: 'unary', operator: node.operator, argument: expressionFact(node.argument) };
  }
  if (node.type === 'LogicalExpression' || node.type === 'BinaryExpression') {
    return {
      kind: 'binary',
      operator: node.operator,
      left: expressionFact(node.left),
      right: expressionFact(node.right),
    };
  }
  if (node.type === 'ConditionalExpression') {
    return {
      kind: 'conditional',
      test: expressionFact(node.test),
      consequent: expressionFact(node.consequent),
      alternate: expressionFact(node.alternate),
    };
  }
  if (node.type === 'CallExpression') {
    return {
      kind: 'call',
      callee: memberPath(node.callee) || identifierName(node.callee),
      args: (node.arguments || []).map(expressionFact),
    };
  }
  if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
    return { kind: 'function', ...functionLikeSignatureFact(node) };
  }
  if (node.type === 'ObjectExpression') {
    const properties = {};
    const spreads = [];
    for (const property of node.properties || []) {
      if (property?.type === 'SpreadElement') {
        spreads.push(expressionFact(property.argument));
        continue;
      }
      if (property?.type !== 'Property') continue;
      const name = identifierName(property.key);
      if (!name) continue;
      properties[name] = property.shorthand ? { kind: 'identifier', name } : expressionFact(property.value);
    }
    return { kind: 'object', properties, spreads };
  }
  if (node.type === 'ArrayExpression') {
    return { kind: 'array', elements: (node.elements || []).map(expressionFact) };
  }
  if (node.type === 'TemplateLiteral') {
    return {
      kind: 'template',
      quasis: (node.quasis || []).map(quasi => String(quasi.value?.cooked ?? quasi.value?.raw ?? '')),
      expressions: (node.expressions || []).map(expressionFact),
    };
  }
  return { kind: node.type || 'unknown' };
}

export function getFunctionReturnFacts(source, functionName, fileName) {
  const sourceFile = parse(source, fileName);
  let declaration = null;
  walkAst(sourceFile, node => {
    if (!declaration && node?.type === 'FunctionDeclaration' && node.id?.name === functionName) {
      declaration = node;
    }
  });
  if (!declaration?.body) return null;
  const returns = [];
  walkAst(declaration.body, node => {
    if (node?.type === 'ReturnStatement') returns.push(expressionFact(node.argument));
  });
  return returns;
}

export function getCallFacts(source, calleeName, fileName) {
  const sourceFile = parse(source, fileName);
  const calls = [];
  walkAst(sourceFile, node => {
    if (node?.type !== 'CallExpression') return;
    const callee = memberPath(node.callee) || identifierName(node.callee);
    if (callee !== calleeName) return;
    calls.push({
      callee,
      args: (node.arguments || []).map(expressionFact),
    });
  });
  return calls;
}

function factContainsIdentifier(fact, identifier) {
  if (!fact || typeof fact !== 'object') return false;
  if (fact.kind === 'identifier' && fact.name === identifier) return true;
  if (fact.kind === 'member' && (fact.path === identifier || fact.path?.startsWith(`${identifier}.`)))
    return true;
  if (Array.isArray(fact)) return fact.some(item => factContainsIdentifier(item, identifier));
  return Object.values(fact).some(value => factContainsIdentifier(value, identifier));
}

export function getExportFacts(source, fileName) {
  const sourceFile = parse(source, fileName);
  const exports = [];
  walkAst(sourceFile, node => {
    if (node?.type !== 'ExportNamedDeclaration') return;
    const sourceValue = node.source?.type === 'Literal' ? String(node.source.value) : null;
    const declaration = node.declaration;
    if (declaration) {
      const declarationName =
        declaration.id?.name ||
        (declaration.type === 'VariableDeclaration' &&
        declaration.declarations?.[0]?.id?.type === 'Identifier'
          ? declaration.declarations[0].id.name
          : null);
      exports.push({
        source: sourceValue,
        exportKind: node.exportKind || 'value',
        local: declarationName,
        exported: declarationName,
        declarationType: declaration.type,
      });
    }
    for (const specifier of node.specifiers || []) {
      if (specifier?.type !== 'ExportSpecifier') continue;
      exports.push({
        source: sourceValue,
        exportKind: node.exportKind || specifier.exportKind || 'value',
        local: identifierName(specifier.local),
        exported: identifierName(specifier.exported),
        declarationType: null,
      });
    }
  });
  return exports;
}

export function assertNamedExports(
  assert,
  source,
  expectedNames,
  { sourceModule = null, exportKind = null, label = 'named exports', fileName } = {}
) {
  const facts = getExportFacts(source, fileName).filter(fact => {
    if (sourceModule !== null && fact.source !== sourceModule) return false;
    if (exportKind !== null && fact.exportKind !== exportKind) return false;
    return true;
  });
  const names = new Set(facts.map(fact => fact.exported).filter(Boolean));
  for (const name of expectedNames) {
    assert.ok(names.has(name), `${label} should export ${name}`);
  }
  return facts;
}

export function getImportFacts(source, fileName) {
  const sourceFile = parse(source, fileName);
  const imports = [];
  walkAst(sourceFile, node => {
    if (node?.type !== 'ImportDeclaration') return;
    const sourceValue = node.source?.type === 'Literal' ? String(node.source.value) : null;
    const specifiers = (node.specifiers || []).map(specifier => ({
      kind: specifier.type,
      imported:
        specifier.type === 'ImportSpecifier'
          ? identifierName(specifier.imported)
          : specifier.type === 'ImportDefaultSpecifier'
            ? 'default'
            : specifier.type === 'ImportNamespaceSpecifier'
              ? '*'
              : null,
      local: identifierName(specifier.local),
    }));
    imports.push({ source: sourceValue, importKind: node.importKind || 'value', specifiers });
  });
  return imports;
}

export function assertImportsFrom(
  assert,
  source,
  sourceModule,
  expectedNames = [],
  { label = sourceModule, fileName } = {}
) {
  const facts = getImportFacts(source, fileName).filter(fact => fact.source === sourceModule);
  assert.ok(facts.length > 0, `${label} should import from ${sourceModule}`);
  const names = new Set(
    facts.flatMap(fact => fact.specifiers.map(specifier => specifier.imported).filter(Boolean))
  );
  for (const name of expectedNames) {
    assert.ok(names.has(name), `${label} should import ${name} from ${sourceModule}`);
  }
  return facts;
}

export function getTypeAssertionFacts(source, fileName) {
  const sourceFile = parse(source, fileName);
  const facts = [];
  walkAst(sourceFile, node => {
    if (node?.type !== 'TSAsExpression' && node?.type !== 'TSTypeAssertion') return;
    facts.push({ expression: expressionFact(node.expression), type: typeName(node.typeAnnotation) });
  });
  return facts;
}

export function getJsxOpeningElementFacts(source, elementName, fileName) {
  const sourceFile = parse(source, fileName);
  const facts = [];
  walkAst(sourceFile, node => {
    if (node?.type !== 'JSXOpeningElement') return;
    const name = identifierName(node.name) || memberPath(node.name);
    if (name !== elementName) return;
    const attributes = {};
    for (const attribute of node.attributes || []) {
      if (attribute?.type !== 'JSXAttribute') continue;
      const attrName = identifierName(attribute.name);
      if (!attrName) continue;
      if (attribute.value == null) {
        attributes[attrName] = { kind: 'literal', value: true };
        continue;
      }
      if (attribute.value.type === 'Literal') {
        attributes[attrName] = { kind: 'literal', value: attribute.value.value };
        continue;
      }
      if (attribute.value.type === 'JSXExpressionContainer') {
        const expression = unwrapExpression(attribute.value.expression);
        if (expression?.type === 'ArrowFunctionExpression' || expression?.type === 'FunctionExpression') {
          attributes[attrName] = {
            kind: 'function',
            ...functionLikeSignatureFact(expression),
            body:
              expression.body?.type === 'BlockStatement'
                ? { kind: 'block' }
                : expressionFact(expression.body),
          };
        } else {
          attributes[attrName] = expressionFact(expression);
        }
      }
    }
    facts.push({ name, selfClosing: node.selfClosing === true, attributes });
  });
  return facts;
}

export function getDeleteMemberFacts(source, fileName) {
  const sourceFile = parse(source, fileName);
  const deletes = [];
  walkAst(sourceFile, node => {
    if (node?.type !== 'UnaryExpression' || node.operator !== 'delete') return;
    const argument = unwrapExpression(node.argument);
    if (argument?.type !== 'MemberExpression') return;
    deletes.push({
      object: memberPath(argument.object) || identifierName(argument.object),
      computed: argument.computed === true,
      property:
        argument.computed && argument.property?.type === 'Identifier'
          ? { kind: 'identifier', name: argument.property.name }
          : argument.computed && argument.property?.type === 'Literal'
            ? { kind: 'literal', value: argument.property.value }
            : { kind: 'identifier', name: identifierName(argument.property) },
    });
  });
  return deletes;
}
export function assertCallObjectContract(
  assert,
  source,
  calleeName,
  {
    argIndex = 1,
    firstArgIdentifier,
    requiredProperties = {},
    requiredIdentifiers = [],
    label = calleeName,
    fileName,
  } = {}
) {
  const calls = getCallFacts(source, calleeName, fileName);
  const match = calls.find(call => {
    if (firstArgIdentifier) {
      const first = call.args[0];
      if (first?.kind !== 'identifier' || first.name !== firstArgIdentifier) return false;
    }
    const object = call.args[argIndex];
    if (object?.kind !== 'object') return false;
    for (const [key, expected] of Object.entries(requiredProperties)) {
      const actual = object.properties[key];
      if (expected === true && actual === undefined) return false;
      if (expected !== true) {
        if (actual?.kind !== 'literal' || actual.value !== expected) return false;
      }
    }
    for (const identifier of requiredIdentifiers) {
      if (!factContainsIdentifier(object, identifier)) return false;
    }
    return true;
  });
  assert.ok(match, `${label} should preserve the semantic call/options contract`);
  return match;
}

export function assertCallExists(
  assert,
  source,
  calleeName,
  predicate = () => true,
  label = calleeName,
  fileName
) {
  const calls = getCallFacts(source, calleeName, fileName);
  assert.ok(calls.some(predicate), `${label} should contain a semantic ${calleeName} call`);
  return calls;
}

export function assertNoCall(assert, source, calleeName, label = calleeName, fileName) {
  const calls = getCallFacts(source, calleeName, fileName);
  assert.equal(calls.length, 0, `${label} should not call ${calleeName}`);
}
