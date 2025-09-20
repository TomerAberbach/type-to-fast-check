import ts from 'typescript'
import {
  anythingArbitrary,
  arrayArbitrary,
  bigIntArbitrary,
  booleanArbitrary,
  constantArbitrary,
  constantFromArbitrary,
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
    return generateArbitrary(type, undefined, typeChecker)
  }

  for (const [flag, generateArbitrary] of typeGenerators) {
    if (type.flags & flag) {
      return generateArbitrary(type, typeChecker)
    }
  }
  return anythingArbitrary()
}

const generateVoidArbitrary = () => constantArbitrary(undefined)

const generateUndefinedArbitrary = () => constantArbitrary(undefined)

const generateNullArbitrary = () => constantArbitrary(null)

const generateBooleanArbitrary = () => booleanArbitrary()

const generateBooleanLiteralArbitrary = (
  type: ts.Type,
  typeChecker: ts.TypeChecker,
) => constantArbitrary(typeChecker.typeToString(type) === `true`)

const generateNumberArbitrary = () => doubleArbitrary()

const generateNumberLiteralArbitrary = (type: ts.Type) =>
  constantArbitrary((type as ts.NumberLiteralType).value)

const generateBigIntArbitrary = () => bigIntArbitrary()

const generateBigIntLiteralArbitrary = (type: ts.Type) => {
  const { value } = type as ts.BigIntLiteralType
  return constantArbitrary(
    BigInt(value.base10Value) * (value.negative ? -1n : 1n),
  )
}

const generateStringArbitrary = () => stringArbitrary()

const generateStringLiteralArbitrary = (type: ts.Type) =>
  constantArbitrary((type as ts.StringLiteralType).value)

const generateSymbolArbitrary = () => symbolArbitrary()

const generateObjectArbitrary = (
  type: ts.Type,
  typeChecker: ts.TypeChecker,
): Arbitrary => {
  const objectType = type as ts.ObjectType

  for (const [flag, generateArbitrary] of objectTypeGenerators) {
    if (objectType.objectFlags & flag) {
      return generateArbitrary(objectType, typeChecker)
    }
  }

  return objectArbitrary()
}

const generateAnonymousObjectArbitrary = (
  type: ts.ObjectType,
  typeChecker: ts.TypeChecker,
): Arbitrary =>
  recordArbitrary(
    new Map(
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

const generateReferenceArbitrary = (
  type: ts.ObjectType,
  typeChecker: ts.TypeChecker,
) => {
  const isBuiltin = Boolean(
    type.symbol.declarations?.some(
      declaration => declaration.getSourceFile().hasNoDefaultLib,
    ),
  )
  if (!isBuiltin) {
    return anythingArbitrary()
  }

  const generateArbitrary = builtinTypeGenerators.get(type.symbol.name)
  if (!generateArbitrary) {
    return anythingArbitrary()
  }

  return generateArbitrary(type as ts.TypeReference, typeChecker)
}

const generateArrayArbitrary = (
  type: ts.TypeReference,
  typeChecker: ts.TypeChecker,
) => {
  const [itemType = typeChecker.getUnknownType()] = type.typeArguments ?? []
  return arrayArbitrary(generateArbitrary(itemType, undefined, typeChecker))
}

const generateNonPrimitiveArbitrary = () => objectArbitrary()

const generateEnumArbitrary = (type: ts.Type) => {
  const enumDeclaration = type.symbol.declarations?.find(declaration =>
    ts.isEnumDeclaration(declaration),
  )
  if (!enumDeclaration) {
    return anythingArbitrary()
  }

  let lastNumericConstant = -1
  const constant = enumDeclaration.members.map(member => {
    if (member.initializer) {
      if (ts.isStringLiteral(member.initializer)) {
        return member.initializer.text
      }
      if (ts.isNumericLiteral(member.initializer)) {
        lastNumericConstant = Number.parseInt(member.initializer.text, 10)
        return lastNumericConstant
      }
    }

    return ++lastNumericConstant
  })

  return constantFromArbitrary(constant)
}

const generateUnionArbitrary = (type: ts.Type, typeChecker: ts.TypeChecker) =>
  oneofArbitrary(
    (type as ts.UnionType).types.map(type =>
      generateArbitrary(type, undefined, typeChecker),
    ),
  )

const generateUnknownArbitrary = () => anythingArbitrary()

const generateAnyArbitrary = () => anythingArbitrary()

const generateTypeParameterArbitrary = (
  type: ts.Type,
  typeChecker: ts.TypeChecker,
) => {
  const constraintType = type.getConstraint()
  return constraintType
    ? generateArbitrary(constraintType, undefined, typeChecker)
    : anythingArbitrary()
}

const typeGenerators = new Map<
  ts.TypeFlags,
  (type: ts.Type, typeChecker: ts.TypeChecker) => Arbitrary
>([
  [ts.TypeFlags.Void, generateVoidArbitrary],
  [ts.TypeFlags.Undefined, generateUndefinedArbitrary],
  [ts.TypeFlags.Null, generateNullArbitrary],
  [ts.TypeFlags.Boolean, generateBooleanArbitrary],
  [ts.TypeFlags.BooleanLiteral, generateBooleanLiteralArbitrary],
  [ts.TypeFlags.Number, generateNumberArbitrary],
  [ts.TypeFlags.NumberLiteral, generateNumberLiteralArbitrary],
  [ts.TypeFlags.BigInt, generateBigIntArbitrary],
  [ts.TypeFlags.BigIntLiteral, generateBigIntLiteralArbitrary],
  [ts.TypeFlags.String, generateStringArbitrary],
  [ts.TypeFlags.StringLiteral, generateStringLiteralArbitrary],
  [ts.TypeFlags.ESSymbol, generateSymbolArbitrary],
  [ts.TypeFlags.Object, generateObjectArbitrary],
  [ts.TypeFlags.NonPrimitive, generateNonPrimitiveArbitrary],
  [ts.TypeFlags.Enum, generateEnumArbitrary],
  [ts.TypeFlags.Union, generateUnionArbitrary],
  [ts.TypeFlags.Unknown, generateUnknownArbitrary],
  [ts.TypeFlags.Any, generateAnyArbitrary],
  [ts.TypeFlags.TypeParameter, generateTypeParameterArbitrary],
])

const objectTypeGenerators = new Map<
  ts.ObjectFlags,
  (type: ts.ObjectType, typeChecker: ts.TypeChecker) => Arbitrary
>([
  [ts.ObjectFlags.Anonymous, generateAnonymousObjectArbitrary],
  [ts.ObjectFlags.Reference, generateReferenceArbitrary],
])

const builtinTypeGenerators = new Map<
  string,
  (type: ts.TypeReference, typeChecker: ts.TypeChecker) => Arbitrary
>([
  [`Array`, generateArrayArbitrary],
  [`ReadonlyArray`, generateArrayArbitrary],
])

export default generateArbitrary
