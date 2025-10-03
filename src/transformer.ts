import * as pkg from 'empathic/package'
import ts from 'typescript'
import { addFastCheckImport } from './fast-check.ts'
import generateArbitrary from './generate.ts'
import normalizeArbitrary from './normalize.ts'
import reifyArbitraryInternal from './reify.ts'

const createTransformer = (
  program: ts.Program,
): ts.TransformerFactory<ts.SourceFile> => {
  const typeChecker = program.getTypeChecker()
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> =>
    (sourceFile: ts.SourceFile): ts.SourceFile => {
      let newSourceFile = ts.visitNode(sourceFile, node =>
        visitTypeToArbCallExpressions(node, typeChecker, context),
      ) as ts.SourceFile
      if (newSourceFile !== sourceFile) {
        newSourceFile = addFastCheckImport(newSourceFile)
      }
      return newSourceFile
    }
}

const visitTypeToArbCallExpressions = (
  node: ts.Node,
  typeChecker: ts.TypeChecker,
  context: ts.TransformationContext,
): ts.Node =>
  visitTypeToArbCallExpression(node, typeChecker) ??
  ts.visitEachChild(
    node,
    node => visitTypeToArbCallExpressions(node, typeChecker, context),
    context,
  )

const visitTypeToArbCallExpression = (
  node: ts.Node,
  typeChecker: ts.TypeChecker,
): ts.Expression | undefined => {
  const isTypeToArbCallExpression =
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === `typeToArb`
  if (!isTypeToArbCallExpression) {
    return
  }

  const symbol = typeChecker.getSymbolAtLocation(node.expression)
  if (!symbol || !isFromTypeToFastCheckPackage(symbol, typeChecker)) {
    return
  }

  const signature = typeChecker.getResolvedSignature(node)
  if (!signature) {
    return
  }

  const typeArguments =
    typeChecker.getTypeArgumentsForResolvedSignature(signature)
  if (typeArguments?.length !== 1) {
    return
  }

  const type = typeArguments[0]!
  const arbitrary = generateArbitrary(type, typeChecker)
  const normalizedArbitrary = normalizeArbitrary(arbitrary)
  return ts.addSyntheticLeadingComment(
    reifyArbitraryInternal(normalizedArbitrary),
    ts.SyntaxKind.SingleLineCommentTrivia,
    ` ${typeChecker.typeToString(type)} `,
    true,
  )
}

const isFromTypeToFastCheckPackage = (
  symbol: ts.Symbol,
  typeChecker: ts.TypeChecker,
): boolean => {
  if (symbol.flags & ts.SymbolFlags.Alias) {
    symbol = typeChecker.getAliasedSymbol(symbol)
  }

  return Boolean(
    symbol.declarations?.some(
      declaration =>
        findPackageJsonPath(declaration.getSourceFile().fileName) ===
        packageJsonPath,
    ),
  )
}

const findPackageJsonPath = (cwd: string): string | null => {
  let packageJsonPath = packageJsonPaths.get(cwd)
  if (packageJsonPath === undefined) {
    packageJsonPath = pkg.up({ cwd }) ?? null
    packageJsonPaths.set(cwd, packageJsonPath)
  }
  return packageJsonPath
}

const packageJsonPaths = new Map<string, string | null>()

const packageJsonPath = findPackageJsonPath(import.meta.dirname)

export default createTransformer
