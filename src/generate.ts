import ts from 'typescript'
import {
  anythingArbitrary,
  arrayArbitrary,
  bigIntArbitrary,
  booleanArbitrary,
  constantArbitrary,
  doubleArbitrary,
  funcArbitrary,
  neverArbitrary,
  objectArbitrary,
  oneofArbitrary,
  recordArbitrary,
  stringArbitrary,
  symbolArbitrary,
  templateArbitrary,
  tupleArbitrary,
} from './arbitrary.ts'
import type { Arbitrary } from './arbitrary.ts'

const generateArbitrary = (
  type: ts.Type,
  typeChecker: ts.TypeChecker,
): Arbitrary => {
  for (const [flag, generateArbitrary] of typeGenerators) {
    if (type.flags & flag) {
      return generateArbitrary(type, typeChecker)
    }
  }
  return anythingArbitrary()
}

const generateNeverArbitrary = () => neverArbitrary()

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

const generateTemplateLiteralArbitrary = (
  type: ts.Type,
  typeChecker: ts.TypeChecker,
) => {
  const { texts, types } = type as ts.TemplateLiteralType

  const template: (string | Arbitrary)[] = []
  for (const [index, text] of texts.entries()) {
    template.push(text)

    if (index >= types.length) {
      continue
    }

    template.push(generateArbitrary(types[index]!, typeChecker))
  }

  return templateArbitrary(template)
}

const generateSymbolArbitrary = () => symbolArbitrary()

const generateObjectArbitrary = (
  type: ts.Type,
  typeChecker: ts.TypeChecker,
): Arbitrary => {
  const objectType = type as ts.ObjectType

  const referenceArbitrary = generateReferenceArbitrary(objectType, typeChecker)
  if (referenceArbitrary) {
    return referenceArbitrary
  }

  // TODO(#20): Support call signatures on objects with properties.
  const callSignatures = typeChecker.getSignaturesOfType(
    type,
    ts.SignatureKind.Call,
  )
  if (callSignatures.length > 0) {
    return generateFunctionArbitrary(type, typeChecker)
  }

  for (const [flag, generateArbitrary] of objectTypeGenerators) {
    if (
      objectType.objectFlags & flag ||
      (objectType.objectFlags & ts.ObjectFlags.Reference &&
        (objectType as ts.TypeReference).target.objectFlags & flag)
    ) {
      return generateArbitrary(objectType, typeChecker)
    }
  }

  return objectArbitrary()
}

const generateReferenceArbitrary = (
  type: ts.ObjectType,
  typeChecker: ts.TypeChecker,
): Arbitrary | undefined => {
  const isBuiltin = Boolean(
    // eslint-disable-next-line typescript/no-unnecessary-condition
    type.symbol?.declarations?.some(
      declaration => declaration.getSourceFile().hasNoDefaultLib,
    ),
  )
  const generateBuiltinArbitrary = isBuiltin
    ? builtinTypeGenerators.get(type.symbol.name)
    : undefined

  const typeReference = type as ts.TypeReference
  return generateBuiltinArbitrary?.(typeReference, typeChecker)
}

const generateFunctionArbitrary = (
  type: ts.Type,
  typeChecker: ts.TypeChecker,
): Arbitrary => {
  const resultArbitraries = typeChecker
    .getSignaturesOfType(type, ts.SignatureKind.Call)
    .map(signature => generateArbitrary(signature.getReturnType(), typeChecker))
  return funcArbitrary(
    resultArbitraries.length === 0
      ? anythingArbitrary()
      : oneofArbitrary(resultArbitraries),
  )
}

const generateObjectLiteralArbitrary = (
  type: ts.ObjectType,
  typeChecker: ts.TypeChecker,
): Arbitrary =>
  recordArbitrary(
    new Map(
      typeChecker.getPropertiesOfType(type).map(symbol => {
        const required = !(symbol.flags & ts.SymbolFlags.Optional)
        const arbitrary = symbol.valueDeclaration
          ? generateArbitrary(
              typeChecker.getTypeOfSymbolAtLocation(
                symbol,
                symbol.valueDeclaration,
              ),
              typeChecker,
            )
          : anythingArbitrary()
        return [symbol.name, { required, arbitrary }]
      }),
    ),
  )

const generateTupleArbitrary = (
  type: ts.ObjectType,
  typeChecker: ts.TypeChecker,
) =>
  tupleArbitrary(
    typeChecker
      .getTypeArguments(type as ts.TupleType)
      .map(elementType => generateArbitrary(elementType, typeChecker)),
  )

const generateArrayArbitrary = (
  type: ts.TypeReference,
  typeChecker: ts.TypeChecker,
) => {
  const [itemType = typeChecker.getUnknownType()] = type.typeArguments ?? []
  return arrayArbitrary(generateArbitrary(itemType, typeChecker))
}

const generateNonPrimitiveArbitrary = () => objectArbitrary()

const generateUnionArbitrary = (type: ts.Type, typeChecker: ts.TypeChecker) =>
  oneofArbitrary(
    (type as ts.UnionType).types.map(type =>
      generateArbitrary(type, typeChecker),
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
    ? generateArbitrary(constraintType, typeChecker)
    : anythingArbitrary()
}

// TODO(#21): Support intersections.
const typeGenerators = new Map<
  ts.TypeFlags,
  (type: ts.Type, typeChecker: ts.TypeChecker) => Arbitrary
>([
  [ts.TypeFlags.Never, generateNeverArbitrary],
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
  [ts.TypeFlags.TemplateLiteral, generateTemplateLiteralArbitrary],
  [ts.TypeFlags.ESSymbol, generateSymbolArbitrary],
  [ts.TypeFlags.UniqueESSymbol, generateSymbolArbitrary],
  [ts.TypeFlags.Object, generateObjectArbitrary],
  [ts.TypeFlags.NonPrimitive, generateNonPrimitiveArbitrary],
  [ts.TypeFlags.Union, generateUnionArbitrary],
  [ts.TypeFlags.Unknown, generateUnknownArbitrary],
  [ts.TypeFlags.Any, generateAnyArbitrary],
  [ts.TypeFlags.TypeParameter, generateTypeParameterArbitrary],
])

const objectTypeGenerators = new Map<
  ts.ObjectFlags,
  (type: ts.ObjectType, typeChecker: ts.TypeChecker) => Arbitrary
>([
  [ts.ObjectFlags.Anonymous, generateObjectLiteralArbitrary],
  [ts.ObjectFlags.Interface, generateObjectLiteralArbitrary],
  [ts.ObjectFlags.Tuple, generateTupleArbitrary],
])

const builtinTypeGenerators = new Map<
  string,
  (type: ts.TypeReference, typeChecker: ts.TypeChecker) => Arbitrary
>([
  [`Array`, generateArrayArbitrary],
  [`ReadonlyArray`, generateArrayArbitrary],
  [`Function`, generateFunctionArbitrary],
])

export default generateArbitrary
