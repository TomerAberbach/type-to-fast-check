import ts from 'typescript'
import { addFastCheckImport } from './fast-check.ts'
import generateArbitrary from './generate.ts'
import normalizeArbitrary from './normalize.ts'
import reifyArbitrary from './reify.ts'

const createTransformer = (
  program: ts.Program,
): ts.TransformerFactory<ts.SourceFile> => {
  const typeChecker = program.getTypeChecker()
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> =>
    (sourceFile: ts.SourceFile): ts.SourceFile => {
      let newSourceFile = ts.visitNode(sourceFile, node =>
        visitTypeToArbitraryCallExpressions(node, typeChecker, context),
      ) as ts.SourceFile
      if (newSourceFile !== sourceFile) {
        newSourceFile = addFastCheckImport(newSourceFile)
      }
      return newSourceFile
    }
}

const visitTypeToArbitraryCallExpressions = (
  node: ts.Node,
  typeChecker: ts.TypeChecker,
  context: ts.TransformationContext,
): ts.Node => {
  const isTypeToArbitraryCallExpression =
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === `typeToArbitrary` &&
    node.typeArguments?.length === 1

  if (isTypeToArbitraryCallExpression) {
    const typeNode = node.typeArguments[0]!
    const arbitrary = generateArbitrary(
      typeChecker.getTypeFromTypeNode(typeNode),
      typeNode,
      typeChecker,
    )
    const normalizedArbitrary = normalizeArbitrary(arbitrary)
    return reifyArbitrary(normalizedArbitrary)
  }

  return ts.visitEachChild(
    node,
    node => visitTypeToArbitraryCallExpressions(node, typeChecker, context),
    context,
  )
}

export default createTransformer
