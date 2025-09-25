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
  stringMatchingArbitrary,
  symbolArbitrary,
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
) => stringMatchingArbitrary(generateRegex(type, typeChecker))

const generateRegex = (type: ts.Type, typeChecker: ts.TypeChecker) => {
  console.log(typeChecker.typeToString(type))
  for (const [flag, generateRegex] of regexGenerators) {
    if (type.flags & flag) {
      return generateRegex(type, typeChecker)
    }
  }
  return ``
}

const generateUndefinedRegex = () => `undefined`

const generateNullRegex = () => `null`

const generateBooleanRegex = () => `false|true`

const generateBooleanLiteralRegex = (
  type: ts.Type,
  typeChecker: ts.TypeChecker,
) => typeChecker.typeToString(type)

// Based on the following code here in `isValidNumberString(value, false)` in:
// https://raw.githubusercontent.com/microsoft/TypeScript/refs/heads/main/src/compiler/checker.ts
const generateNumberRegex = () =>
  `\\s*[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?\\s*`

const generateNumberLiteralRegex = (type: ts.Type) =>
  String((type as ts.NumberLiteralType).value)

const generateBigIntRegex = () =>
  `0[bB][01]+|0[oO][0-7]+|0[xX][\\da-fA-F]+|0|[1-9]\\d*`

const generateBigIntLiteralRegex = (type: ts.Type) => {
  const { value } = type as ts.BigIntLiteralType
  return (value.negative ? `-` : ``) + value.base10Value
}

const generateStringRegex = () => `(?:.|\\n)*`

const generateStringLiteralRegex = (type: ts.Type) =>
  escapeRegex((type as ts.StringLiteralType).value)

const escapeRegex = (string: string) =>
  string.replaceAll(/[$()*+.?[\\\]^{|}]/gu, `\\$&`)

const generateTemplateLiteralRegex = (
  type: ts.Type,
  typeChecker: ts.TypeChecker,
) => {
  const { texts, types } = type as ts.TemplateLiteralType

  const regexPieces: string[] = []
  for (const [index, text] of texts.entries()) {
    regexPieces.push(text)

    if (index >= types.length) {
      continue
    }

    let regex = generateRegex(types[index]!, typeChecker)
    if (concatenatingRegexRequiresParenthesizing(regex)) {
      regex = `(?:${regex})`
    }
    regexPieces.push(regex)
  }

  return regexPieces.join(``)
}

const generateUnionRegex = (
  type: ts.Type,
  typeChecker: ts.TypeChecker,
): string =>
  (type as ts.UnionType).types
    .map(type => generateRegex(type, typeChecker))
    .join(`|`)

const concatenatingRegexRequiresParenthesizing = (regex: string): boolean => {
  // Empty string is safe
  if (!regex) {
    return false
  }

  // Remove escaped characters to avoid false positives.
  regex = regex.replaceAll(/\\./gu, ``)

  let depth = 0
  for (const c of regex) {
    if (c === `(`) {
      depth++
    } else if (c === `)`) {
      depth--
    } else if (c === `|` && depth === 0) {
      return true
    }
  }

  return false
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

const generateAnonymousObjectArbitrary = (
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

// TODO
// Intersection = 2097152,
// Index = 4194304,
// IndexedAccess = 8388608,
// Conditional = 16777216,
// Substitution = 33554432,
// NonPrimitive = 67108864,
// TemplateLiteral = 134217728,
// StringMapping = 268435456,
// Literal = 2944,
// Unit = 109472,
// Freshable = 2976,
// StringOrNumberLiteral = 384,
// PossiblyFalsy = 117724,
// StructuredType = 3670016,
// TypeVariable = 8650752,
// InstantiableNonPrimitive = 58982400,
// InstantiablePrimitive = 406847488,
// Instantiable = 465829888,
// StructuredOrInstantiable = 469499904,
// Narrowable = 536624127,

const objectTypeGenerators = new Map<
  ts.ObjectFlags,
  (type: ts.ObjectType, typeChecker: ts.TypeChecker) => Arbitrary
>([
  [ts.ObjectFlags.Anonymous, generateAnonymousObjectArbitrary],
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

const regexGenerators = new Map<
  ts.TypeFlags,
  (type: ts.Type, typeChecker: ts.TypeChecker) => string
>([
  [ts.TypeFlags.Undefined, generateUndefinedRegex],
  [ts.TypeFlags.Null, generateNullRegex],
  [ts.TypeFlags.Boolean, generateBooleanRegex],
  [ts.TypeFlags.BooleanLiteral, generateBooleanLiteralRegex],
  [ts.TypeFlags.Number, generateNumberRegex],
  [ts.TypeFlags.NumberLike, generateNumberLiteralRegex],
  [ts.TypeFlags.BigInt, generateBigIntRegex],
  [ts.TypeFlags.BigIntLike, generateBigIntLiteralRegex],
  [ts.TypeFlags.String, generateStringRegex],
  [ts.TypeFlags.StringLiteral, generateStringLiteralRegex],
  [ts.TypeFlags.TemplateLiteral, generateTemplateLiteralRegex],
  [ts.TypeFlags.Union, generateUnionRegex],
])

export default generateArbitrary
