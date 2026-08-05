const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const root = path.join(__dirname, '..');
const sourceRoot = path.join(root, 'src');

function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesIn(target);
    return entry.name.endsWith('.js') && !target.includes(`${path.sep}locales${path.sep}`) ? [target] : [];
  });
}

function germanTest(node) {
  if (t.isIdentifier(node, { name: 'isDe' })) return true;
  if (!t.isBinaryExpression(node, { operator: '===' })) return false;
  return (t.isIdentifier(node.left, { name: 'language' }) && t.isStringLiteral(node.right, { value: 'de' }))
    || (t.isIdentifier(node.right, { name: 'language' }) && t.isStringLiteral(node.left, { value: 'de' }));
}

for (const filename of filesIn(sourceRoot)) {
  const source = fs.readFileSync(filename, 'utf8');
  const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
  let changed = false;
  traverse(ast, {
    CallExpression(pathRef) {
      if (t.isIdentifier(pathRef.node.callee, { name: 'localize' }) && pathRef.node.arguments.length > 1) {
        pathRef.node.arguments = [pathRef.node.arguments[0]];
        changed = true;
      }
    },
    ConditionalExpression(pathRef) {
      if (!germanTest(pathRef.node.test)) return;
      pathRef.replaceWith(t.callExpression(t.identifier('localize'), [pathRef.node.alternate]));
      changed = true;
    },
    JSXText(pathRef) {
      const value = pathRef.node.value.trim();
      if (!value) return;
      pathRef.replaceWith(t.jsxExpressionContainer(
        t.callExpression(t.identifier('localize'), [t.stringLiteral(value)]),
      ));
      changed = true;
    },
    JSXAttribute(pathRef) {
      const supported = new Set(['placeholder', 'accessibilityLabel']);
      if (!supported.has(pathRef.node.name.name) || !t.isStringLiteral(pathRef.node.value)) return;
      pathRef.node.value = t.jsxExpressionContainer(
        t.callExpression(t.identifier('localize'), [t.stringLiteral(pathRef.node.value.value)]),
      );
      changed = true;
    },
    CallExpression(pathRef) {
      if (t.isIdentifier(pathRef.node.callee, { name: 'localize' })) {
        if (pathRef.node.arguments.length > 1) pathRef.node.arguments = [pathRef.node.arguments[0]];
        return;
      }
      if (!t.isMemberExpression(pathRef.node.callee)
        || !t.isIdentifier(pathRef.node.callee.object, { name: 'Alert' })
        || !t.isIdentifier(pathRef.node.callee.property, { name: 'alert' })) return;
      pathRef.node.arguments = pathRef.node.arguments.map((argument) =>
        t.isStringLiteral(argument)
          ? t.callExpression(t.identifier('localize'), [argument])
          : argument);
      changed = true;
    },
  });
  if (!changed) continue;
  const relative = path.relative(path.dirname(filename), path.join(sourceRoot, 'locales')).replaceAll(path.sep, '/');
  const importPath = relative.startsWith('.') ? relative : `./${relative}`;
  const hasImport = ast.program.body.some((node) => t.isImportDeclaration(node)
    && node.specifiers.some((specifier) => t.isImportSpecifier(specifier)
      && specifier.imported.name === 'localize'));
  if (!hasImport) {
    ast.program.body.unshift(t.importDeclaration(
      [t.importSpecifier(t.identifier('localize'), t.identifier('localize'))],
      t.stringLiteral(importPath),
    ));
  }
  fs.writeFileSync(filename, `${generate(ast, { retainLines: true }, source).code}\n`);
}
