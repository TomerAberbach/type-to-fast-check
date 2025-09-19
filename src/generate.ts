import ts from 'typescript'
import {
  anythingArbitrary,
  bigIntArbitrary,
  booleanArbitrary,
  constantArbitrary,
  doubleArbitrary,
  objectArbitrary,
  oneofArbitrary,
  recordArbitrary,
  stringArbitrary,
  symbolArbitrary,
} from './arbitrary.ts'
import type { Arbitrary } from './arbitrary.ts'

const generateArbitrary = (
  type: ts.Type,
  typeNode: ts.TypeNode | undefined,
  typeChecker: ts.TypeChecker,
): Arbitrary => {
  if (typeNode && ts.isThisTypeNode(typeNode)) {
    // TODO
    return generateArbitrary(type, undefined, typeChecker)
  }

  if (type.flags & (ts.TypeFlags.Void | ts.TypeFlags.Undefined)) {
    return constantArbitrary(undefined)
  }
  if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
    return anythingArbitrary()
  }
  if (type.flags & ts.TypeFlags.Boolean) {
    return booleanArbitrary()
  }
  if (type.flags & ts.TypeFlags.Number) {
    return doubleArbitrary()
  }
  if (type.flags & ts.TypeFlags.BigInt) {
    return bigIntArbitrary()
  }
  if (type.flags & ts.TypeFlags.String) {
    return stringArbitrary()
  }
  if (type.flags & ts.TypeFlags.BooleanLiteral) {
    return constantArbitrary(typeChecker.typeToString(type) === `true`)
  }
  if (type.isLiteral()) {
    const value =
      typeof type.value === `object`
        ? BigInt(type.value.base10Value) * (type.value.negative ? -1n : 1n)
        : type.value
    return constantArbitrary(value)
  }
  if (type.flags & ts.TypeFlags.ESSymbol) {
    return symbolArbitrary()
  }
  if (type.flags & ts.TypeFlags.Null) {
    return constantArbitrary(null)
  }
  if (type.flags & ts.TypeFlags.Never) {
    // TODO
  }
  if (type.flags & ts.TypeFlags.Object) {
    return generateRawObjectArbitrary(type as ts.ObjectType, typeChecker)
  }
  if (type.flags & ts.TypeFlags.NonPrimitive) {
    return objectArbitrary()
  }

  if (type.isUnion()) {
    return oneofArbitrary(
      type.types.map(type => generateArbitrary(type, undefined, typeChecker)),
    )
  }

  if (type.flags & ts.TypeFlags.TypeParameter) {
    const constraintType = type.getConstraint()
    return constraintType
      ? generateArbitrary(constraintType, undefined, typeChecker)
      : anythingArbitrary()
  }

  return anythingArbitrary()
}

const generateRawObjectArbitrary = (
  type: ts.ObjectType,
  typeChecker: ts.TypeChecker,
): Arbitrary =>
  recordArbitrary(
    Object.fromEntries(
      typeChecker.getPropertiesOfType(type).map(symbol => {
        const required = !(symbol.flags & ts.SymbolFlags.Optional)
        const arbitrary = generateArbitrary(
          typeChecker.getTypeOfSymbolAtLocation(
            symbol,
            symbol.valueDeclaration!,
          ),
          undefined,
          typeChecker,
        )
        return [symbol.name, { required, arbitrary }]
      }),
    ),
  )

export default generateArbitrary
