import ts from 'typescript'

export const fcCallExpression = (
  methodName: string,
  argExpressions: ts.Expression[] = [],
): ts.CallExpression =>
  ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      ts.factory.createIdentifier(FAST_CHECK_IDENTIFIER_NAME),
      ts.factory.createIdentifier(methodName),
    ),
    undefined,
    argExpressions,
  )

export const addFastCheckImport = (
  sourceFile: ts.SourceFile,
): ts.SourceFile => {
  const importDeclaration = ts.factory.createImportDeclaration(
    undefined,
    ts.factory.createImportClause(
      undefined,
      undefined,
      ts.factory.createNamespaceImport(
        ts.factory.createIdentifier(FAST_CHECK_IDENTIFIER_NAME),
      ),
    ),
    ts.factory.createStringLiteral(`fast-check`),
  )
  return ts.factory.updateSourceFile(sourceFile, [
    importDeclaration,
    ...sourceFile.statements,
  ])
}

const FAST_CHECK_IDENTIFIER_NAME = `ttfc`
