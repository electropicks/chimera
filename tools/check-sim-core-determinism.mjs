// @ts-check

import ts from "typescript";

/** @typedef {"Date.now" | "Math.random"} ForbiddenApi */

/**
 * @typedef {object} ForbiddenApiFinding
 * @property {ForbiddenApi} api
 * @property {string} filePath
 * @property {number} line
 */

/** @type {ReadonlyMap<string, ForbiddenApi>} */
const FORBIDDEN_MEMBERS = new Map([
  ["Math.random", "Math.random"],
  ["Date.now", "Date.now"],
]);

/**
 * @param {ReadonlyMap<string, string>} files
 * @returns {ForbiddenApiFinding[]}
 */
export function findForbiddenSimCoreApis(files) {
  /** @type {ForbiddenApiFinding[]} */
  const findings = [];

  for (const [filePath, source] of files) {
    const sourceFile = ts.createSourceFile(
      filePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    /** @param {ts.Node} node */
    const visit = (node) => {
      const api = getForbiddenApi(node);

      if (api) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        findings.push({
          api,
          filePath,
          line: line + 1,
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  return findings;
}

/**
 * @param {ts.Node} node
 * @returns {ForbiddenApi | undefined}
 */
function getForbiddenApi(node) {
  if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
    return FORBIDDEN_MEMBERS.get(`${node.expression.text}.${node.name.text}`);
  }

  if (
    ts.isElementAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.argumentExpression &&
    ts.isStringLiteralLike(node.argumentExpression)
  ) {
    return FORBIDDEN_MEMBERS.get(`${node.expression.text}.${node.argumentExpression.text}`);
  }

  if (
    ts.isBindingElement(node) &&
    ts.isObjectBindingPattern(node.parent) &&
    ts.isVariableDeclaration(node.parent.parent)
  ) {
    const { initializer } = node.parent.parent;

    if (!initializer || !ts.isIdentifier(initializer)) {
      return undefined;
    }

    const objectName = initializer.text;
    const memberName = getBindingElementPropertyName(node);

    if (memberName) {
      return FORBIDDEN_MEMBERS.get(`${objectName}.${memberName}`);
    }
  }

  return undefined;
}

/**
 * @param {ts.BindingElement} node
 * @returns {string | undefined}
 */
function getBindingElementPropertyName(node) {
  if (node.propertyName) {
    if (ts.isIdentifier(node.propertyName) || ts.isStringLiteralLike(node.propertyName)) {
      return node.propertyName.text;
    }

    return undefined;
  }

  return ts.isIdentifier(node.name) ? node.name.text : undefined;
}
