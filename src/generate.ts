import ts from 'typescript'
import {
  anythingArbitrary,
  arrayArbitrary,
  assignArbitrary,
  bigIntArbitrary,
  bigIntArrayArbitrary,
  booleanArbitrary,
  constantArbitrary,
  dictionaryArbitrary,
  doubleArbitrary,
  floatArrayArbitrary,
  funcArbitrary,
  intArrayArbitrary,
  mapStringArbitrary,
  metaArbitrary,
  mutableArbitrary,
  neverArbitrary,
  objectArbitrary,
  oneofArbitrary,
  recordArbitrary,
  stringArbitrary,
  symbolArbitrary,
  templateArbitrary,
  tieArbitrary,
  tupleArbitrary,
} from './arbitrary.ts'
import type {
  Arbitrary,
  MapStringArbitrary,
  MutableArbitrary,
} from './arbitrary.ts'
import { addDiagnostic, NEW_ISSUE_LINK } from './diagnostics.ts'
import type { Meta, MetaType } from './meta.ts'
import { META_TYPES } from './meta.ts'
import normalizeArbitrary from './normalize.ts'
import { isFromTypeToFastCheckPackage } from './package.ts'

const generateArbitrary = (
  type: ts.Type,
  node: ts.TypeNode,
  typeChecker: ts.TypeChecker,
): Arbitrary => {
  let arbitrary = unsetMutableArbitraries.get(type)
  if (arbitrary) {
    return tieArbitrary(arbitrary)
  }

  // Set the arbitrary now to avoid infinite recursion for recursive types.
  arbitrary = mutableArbitrary(null)
  unsetMutableArbitraries.set(type, arbitrary)

  for (const [flag, generateArbitrary] of typeGenerators) {
    if (type.flags & flag) {
      arbitrary.value = generateArbitrary(type, node, typeChecker)
      break
    }
  }

  if (!arbitrary.value) {
    addDiagnostic(
      node,
      ts.DiagnosticCategory.Error,
      `Unknown type. [File an issue](${NEW_ISSUE_LINK}).`,
    )
    arbitrary.value = anythingArbitrary()
  }

  unsetMutableArbitraries.delete(type)

  return arbitrary
}

const unsetMutableArbitraries = new Map<ts.Type, MutableArbitrary>()

const generateNeverArbitrary = () => neverArbitrary()

const generateVoidArbitrary = () => constantArbitrary(undefined)

const generateUndefinedArbitrary = () => constantArbitrary(undefined)

const generateNullArbitrary = () => constantArbitrary(null)

const generateBooleanArbitrary = () => booleanArbitrary()

const generateBooleanLiteralArbitrary = (
  type: ts.Type,
  _node: ts.TypeNode,
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
  node: ts.TypeNode,
  typeChecker: ts.TypeChecker,
) => {
  const { texts, types } = type as ts.TemplateLiteralType

  const template: (string | Arbitrary)[] = []
  for (const [index, text] of texts.entries()) {
    template.push(text)

    if (index >= types.length) {
      continue
    }

    template.push(
      generateArbitrary(
        types[index]!,
        getTemplateLiteralSpanNode(node, index) ?? node,
        typeChecker,
      ),
    )
  }

  return templateArbitrary(template)
}

const getTemplateLiteralSpanNode = (
  node: ts.TypeNode,
  index: number,
): ts.TypeNode | null =>
  ts.isTemplateLiteralTypeNode(node)
    ? (node.templateSpans[index]?.type ?? null)
    : null

const generateStringMappingArbitrary = (
  type: ts.Type,
  node: ts.TypeNode,
  typeChecker: ts.TypeChecker,
) => {
  const stringMappingType = type as ts.StringMappingType
  const stringNode = ts.isTypeReferenceNode(node)
    ? (node.typeArguments?.[0] ?? node)
    : node
  const arbitrary = generateArbitrary(
    stringMappingType.type,
    stringNode,
    typeChecker,
  )

  const operation = stringMappingOperations.get(stringMappingType.symbol.name)
  if (!operation) {
    addDiagnostic(
      node,
      ts.DiagnosticCategory.Error,
      `Unknown string mapping type. [File an issue](${NEW_ISSUE_LINK}).`,
    )
    return arbitrary
  }

  return mapStringArbitrary({ arbitrary, operation })
}

const stringMappingOperations: ReadonlyMap<
  string,
  MapStringArbitrary[`operation`]
> = new Map([
  [`Lowercase`, `lowercase`],
  [`Uppercase`, `uppercase`],
  [`Uncapitalize`, `uncapitalize`],
  [`Capitalize`, `capitalize`],
])

const generateSymbolArbitrary = () => symbolArbitrary()

const generateObjectArbitrary = (
  type: ts.Type,
  node: ts.TypeNode,
  typeChecker: ts.TypeChecker,
): Arbitrary => {
  const objectType = type as ts.ObjectType

  const referenceArbitrary = generateReferenceArbitrary(
    objectType,
    node,
    typeChecker,
  )
  if (referenceArbitrary) {
    return referenceArbitrary
  }

  const callSignatures = typeChecker.getSignaturesOfType(
    type,
    ts.SignatureKind.Call,
  )
  const functionArbitrary =
    callSignatures.length > 0
      ? generateFunctionArbitrary(type, node, typeChecker)
      : undefined
  const indexArbitrary = generateIndexArbitrary(objectType, node, typeChecker)

  let objArbitrary: Arbitrary | undefined
  for (const [flag, generateArbitrary] of objectTypeGenerators) {
    if (matchesObjectFlag(objectType, flag)) {
      objArbitrary = generateArbitrary(objectType, node, typeChecker)
      break
    }
  }

  const arbitraries = [functionArbitrary, indexArbitrary, objArbitrary].filter(
    arbitrary => arbitrary !== undefined,
  )
  return arbitraries.length > 0
    ? assignArbitrary(arbitraries)
    : objectArbitrary()
}

const generateReferenceArbitrary = (
  type: ts.ObjectType,
  node: ts.TypeNode,
  typeChecker: ts.TypeChecker,
): Arbitrary | undefined => {
  const isBuiltin = Boolean(
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    type.symbol?.declarations?.some(
      declaration => declaration.getSourceFile().hasNoDefaultLib,
    ),
  )
  const generateBuiltinArbitrary = isBuiltin
    ? builtinTypeGenerators.get(type.symbol.name)
    : undefined

  const typeReference = type as ts.TypeReference
  return generateBuiltinArbitrary?.(typeReference, node, typeChecker)
}

const generateFunctionArbitrary = (
  type: ts.Type,
  node: ts.TypeNode,
  typeChecker: ts.TypeChecker,
): Arbitrary => {
  const resultArbitraries = typeChecker
    .getSignaturesOfType(type, ts.SignatureKind.Call)
    .map(signature => {
      const returnTypeNode = ts.isFunctionTypeNode(node) ? node.type : node
      return generateArbitrary(
        signature.getReturnType(),
        returnTypeNode,
        typeChecker,
      )
    })
  return funcArbitrary(
    resultArbitraries.length === 0
      ? anythingArbitrary()
      : oneofArbitrary(resultArbitraries),
  )
}

const generateIndexArbitrary = (
  type: ts.ObjectType,
  node: ts.TypeNode,
  typeChecker: ts.TypeChecker,
): Arbitrary | undefined => {
  if (matchesObjectFlag(type, ts.ObjectFlags.Tuple)) {
    return undefined
  }

  const indexInfos = typeChecker.getIndexInfosOfType(type)
  if (indexInfos.length === 0) {
    return undefined
  }

  const valueToKeyArbitraries = new Map<Arbitrary, Set<Arbitrary>>()
  for (const indexInfo of indexInfos) {
    const { keyNode, valueNode } = getIndexSignatureNodes(node, indexInfo)
    const keyArbitrary = generateArbitrary(
      indexInfo.keyType,
      keyNode,
      typeChecker,
    )
    const valueArbitrary = generateArbitrary(
      indexInfo.type,
      valueNode,
      typeChecker,
    )

    let keyArbitraries = valueToKeyArbitraries.get(valueArbitrary)
    if (!keyArbitraries) {
      keyArbitraries = new Set()
      valueToKeyArbitraries.set(valueArbitrary, keyArbitraries)
    }
    keyArbitraries.add(keyArbitrary)
  }

  return assignArbitrary(
    Array.from(valueToKeyArbitraries, ([valueArbitrary, keyArbitraries]) =>
      dictionaryArbitrary({
        key: oneofArbitrary([...keyArbitraries]),
        value: valueArbitrary,
      }),
    ),
  )
}

const matchesObjectFlag = (
  type: ts.ObjectType,
  flag: ts.ObjectFlags,
): boolean =>
  Boolean(
    type.objectFlags & flag ||
      (type.objectFlags & ts.ObjectFlags.Reference &&
        (type as ts.TypeReference).target.objectFlags & flag),
  )

const getIndexSignatureNodes = (
  node: ts.TypeNode,
  indexInfo: ts.IndexInfo,
): { keyNode: ts.TypeNode; valueNode: ts.TypeNode } => {
  if (!indexInfo.declaration) {
    return { keyNode: node, valueNode: node }
  }

  const { parameters, type } = indexInfo.declaration
  return { keyNode: parameters[0]?.type ?? node, valueNode: type }
}

const generateObjectLiteralArbitrary = (
  type: ts.ObjectType,
  node: ts.TypeNode,
  typeChecker: ts.TypeChecker,
): Arbitrary =>
  recordArbitrary(
    new Map(
      typeChecker.getPropertiesOfType(type).map(symbol => {
        const required = !(symbol.flags & ts.SymbolFlags.Optional)
        const arbitrary = generateArbitrary(
          typeChecker.getTypeOfSymbol(symbol),
          getPropertyNode(node, symbol.name) ?? node,
          typeChecker,
        )
        return [symbol.name, { required, arbitrary }]
      }),
    ),
  )

const getPropertyNode = (
  node: ts.TypeNode,
  name: string,
): ts.TypeNode | null => {
  if (!ts.isTypeLiteralNode(node)) {
    return null
  }

  for (const member of node.members) {
    if (!ts.isPropertySignature(member)) {
      continue
    }
    if (
      (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) &&
      member.name.text === name
    ) {
      return member.type ?? null
    }
  }

  return null
}

const generateTupleArbitrary = (
  type: ts.ObjectType,
  node: ts.TypeNode,
  typeChecker: ts.TypeChecker,
) => {
  const referenceType = type as ts.TypeReference
  const tupleType = referenceType.target as ts.TupleType
  const arbitrary = tupleArbitrary(
    typeChecker.getTypeArguments(referenceType).map((elementType, index) => {
      const arbitrary = generateArbitrary(
        elementType,
        getTupleElementNode(node, index) ?? node,
        typeChecker,
      )
      return tupleType.elementFlags[index]! & ts.ElementFlags.Rest
        ? { arbitrary: arrayArbitrary(arbitrary), rest: true }
        : { arbitrary, rest: false }
    }),
  )

  const firstOptionalElementIndex = tupleType.elementFlags.findIndex(
    flags => flags & ts.ElementFlags.Optional,
  )
  if (firstOptionalElementIndex === -1) {
    return arbitrary
  }

  const variantArbitraries: Arbitrary[] = []
  for (
    let endIndex = firstOptionalElementIndex;
    endIndex <= tupleType.elementFlags.length;
    endIndex++
  ) {
    variantArbitraries.push(
      tupleArbitrary(arbitrary.elements.slice(0, endIndex)),
    )
  }
  return oneofArbitrary(variantArbitraries)
}

const getTupleElementNode = (
  node: ts.TypeNode,
  index: number,
): ts.TypeNode | null => {
  if (!ts.isTupleTypeNode(node)) {
    return null
  }

  const element = node.elements[index]
  if (!element) {
    return null
  }

  return ts.isNamedTupleMember(element) ? element.type : element
}

const generateInt8ArrayArbitrary = () =>
  intArrayArbitrary({ bits: 8, signed: true, clamped: false })

const generateUint8ArrayArbitrary = () =>
  intArrayArbitrary({ bits: 8, signed: false, clamped: false })

const generateUint8ClampedArrayArbitrary = () =>
  intArrayArbitrary({ bits: 8, signed: false, clamped: true })

const generateInt16ArrayArbitrary = () =>
  intArrayArbitrary({ bits: 16, signed: true, clamped: false })

const generateUint16ArrayArbitrary = () =>
  intArrayArbitrary({ bits: 16, signed: false, clamped: false })

const generateInt32ArrayArbitrary = () =>
  intArrayArbitrary({ bits: 32, signed: true, clamped: false })

const generateUint32ArrayArbitrary = () =>
  intArrayArbitrary({ bits: 32, signed: false, clamped: false })

const generateBigInt64ArrayArbitrary = () =>
  bigIntArrayArbitrary({ signed: true })

const generateBigUint64ArrayArbitrary = () =>
  bigIntArrayArbitrary({ signed: false })

const generateFloat16ArrayArbitrary = () => floatArrayArbitrary({ bits: 16 })

const generateFloat32ArrayArbitrary = () => floatArrayArbitrary({ bits: 32 })

const generateFloat64ArrayArbitrary = () => floatArrayArbitrary({ bits: 64 })

const generateArrayArbitrary = (
  type: ts.TypeReference,
  node: ts.TypeNode,
  typeChecker: ts.TypeChecker,
) => {
  const [itemType = typeChecker.getUnknownType()] = type.typeArguments ?? []
  return arrayArbitrary(
    generateArbitrary(itemType, getArrayItemNode(node) ?? node, typeChecker),
  )
}

const getArrayItemNode = (node: ts.TypeNode): ts.TypeNode | null => {
  if (ts.isArrayTypeNode(node)) {
    return node.elementType
  }

  if (ts.isTypeReferenceNode(node)) {
    return node.typeArguments?.[0] ?? null
  }

  return null
}

const generateNonPrimitiveArbitrary = () => objectArbitrary()

const generateUnionArbitrary = (
  type: ts.Type,
  node: ts.TypeNode,
  typeChecker: ts.TypeChecker,
) =>
  oneofArbitrary(
    (type as ts.UnionType).types.map((memberType, index) =>
      generateArbitrary(
        memberType,
        ts.isUnionTypeNode(node) ? (node.types[index] ?? node) : node,
        typeChecker,
      ),
    ),
  )

const generateIntersectionArbitrary = (
  type: ts.Type,
  node: ts.TypeNode,
  typeChecker: ts.TypeChecker,
) => {
  const { types } = type as ts.IntersectionType
  if (types.length !== 2) {
    // TODO(#21): Support intersections.
    addDiagnostic(
      node,
      ts.DiagnosticCategory.Error,
      `Complex intersections are not yet supported.`,
    )
    return anythingArbitrary()
  }

  for (const [index, type] of types.entries()) {
    const symbols = typeChecker.getPropertiesOfType(type)
    if (symbols.length !== 1) {
      continue
    }

    const memberNode = ts.isIntersectionTypeNode(node)
      ? (node.types[index] ?? node)
      : node
    const meta = extractMeta(symbols[0]!, memberNode, typeChecker)
    if (!meta) {
      continue
    }

    const otherType = types[index === 0 ? 1 : 0]!
    return metaArbitrary({
      arbitrary: generateArbitrary(otherType, memberNode, typeChecker),
      meta,
    })
  }

  // TODO(#21): Support intersections.
  addDiagnostic(
    node,
    ts.DiagnosticCategory.Error,
    `Complex intersections are not yet supported.`,
  )
  return anythingArbitrary()
}

const extractMeta = (
  symbol: ts.Symbol,
  node: ts.TypeNode,
  typeChecker: ts.TypeChecker,
): Meta | null => {
  if (!symbol.valueDeclaration) {
    return null
  }

  if (
    !ts.isPropertySignature(symbol.valueDeclaration) &&
    !ts.isPropertyDeclaration(symbol.valueDeclaration)
  ) {
    return null
  }

  const { name } = symbol.valueDeclaration
  if (!ts.isComputedPropertyName(name)) {
    return null
  }

  const nameType = typeChecker.getTypeAtLocation(name.expression)
  if (!(nameType.flags & ts.TypeFlags.UniqueESSymbol)) {
    return null
  }

  if (!isFromTypeToFastCheckPackage(symbol, typeChecker)) {
    return null
  }

  // At this point we can assume this is the `metaSymbol` because there's no
  // other `unique symbol` in the `type-to-fast-check` package.
  const metaType = typeChecker.getTypeOfSymbol(symbol)
  const metaConstant = typeToConstant(
    metaType,
    symbol.valueDeclaration.type ?? node,
    typeChecker,
  )
  if (!metaConstant) {
    return null
  }

  const meta = metaConstant.value
  if (
    typeof meta !== `object` ||
    meta === null ||
    !META_TYPES.has((meta as Record<PropertyKey, unknown>).type as MetaType)
  ) {
    return null
  }

  return meta as Meta
}

const typeToConstant = (
  type: ts.Type,
  node: ts.TypeNode,
  typeChecker: ts.TypeChecker,
): { value: unknown } | null => {
  const arbitrary = normalizeArbitrary(
    generateArbitrary(type, node, typeChecker),
  )
  return arbitrary.type === `constant` ? { value: arbitrary.value } : null
}

const generateUnknownArbitrary = () => anythingArbitrary()

const generateAnyArbitrary = () => anythingArbitrary()

const generateTypeParameterArbitrary = (
  type: ts.Type,
  node: ts.TypeNode,
  typeChecker: ts.TypeChecker,
) => {
  addDiagnostic(
    node,
    ts.DiagnosticCategory.Warning,
    `Cannot dynamically generate type parameter arbitrary. Using its constraint type.`,
  )

  const constraintType = type.getConstraint()
  if (!constraintType) {
    addDiagnostic(
      node,
      ts.DiagnosticCategory.Warning,
      `Type parameter has no constraint type. Using \`unknown\`.`,
    )
    return anythingArbitrary()
  }

  return generateArbitrary(
    constraintType,
    ts.isTypeParameterDeclaration(node) ? (node.constraint ?? node) : node,
    typeChecker,
  )
}

const typeGenerators = new Map<
  ts.TypeFlags,
  (type: ts.Type, node: ts.TypeNode, typeChecker: ts.TypeChecker) => Arbitrary
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
  [ts.TypeFlags.StringMapping, generateStringMappingArbitrary],
  [ts.TypeFlags.ESSymbol, generateSymbolArbitrary],
  [ts.TypeFlags.UniqueESSymbol, generateSymbolArbitrary],
  [ts.TypeFlags.Object, generateObjectArbitrary],
  [ts.TypeFlags.NonPrimitive, generateNonPrimitiveArbitrary],
  [ts.TypeFlags.Union, generateUnionArbitrary],
  [ts.TypeFlags.Intersection, generateIntersectionArbitrary],
  [ts.TypeFlags.Unknown, generateUnknownArbitrary],
  [ts.TypeFlags.Any, generateAnyArbitrary],
  [ts.TypeFlags.TypeParameter, generateTypeParameterArbitrary],
])

const objectTypeGenerators = new Map<
  ts.ObjectFlags,
  (
    type: ts.ObjectType,
    node: ts.TypeNode,
    typeChecker: ts.TypeChecker,
  ) => Arbitrary
>([
  [ts.ObjectFlags.Anonymous, generateObjectLiteralArbitrary],
  [ts.ObjectFlags.Interface, generateObjectLiteralArbitrary],
  [ts.ObjectFlags.Tuple, generateTupleArbitrary],
  [ts.ObjectFlags.Mapped, generateObjectLiteralArbitrary],
])

const builtinTypeGenerators = new Map<
  string,
  (
    type: ts.TypeReference,
    node: ts.TypeNode,
    typeChecker: ts.TypeChecker,
  ) => Arbitrary
>([
  [`Int8Array`, generateInt8ArrayArbitrary],
  [`Uint8Array`, generateUint8ArrayArbitrary],
  [`Uint8ClampedArray`, generateUint8ClampedArrayArbitrary],
  [`Int16Array`, generateInt16ArrayArbitrary],
  [`Uint16Array`, generateUint16ArrayArbitrary],
  [`Int32Array`, generateInt32ArrayArbitrary],
  [`Uint32Array`, generateUint32ArrayArbitrary],
  [`BigInt64Array`, generateBigInt64ArrayArbitrary],
  [`BigUint64Array`, generateBigUint64ArrayArbitrary],
  [`Float16Array`, generateFloat16ArrayArbitrary],
  [`Float32Array`, generateFloat32ArrayArbitrary],
  [`Float64Array`, generateFloat64ArrayArbitrary],
  [`Array`, generateArrayArbitrary],
  [`ReadonlyArray`, generateArrayArbitrary],
  [`Function`, generateFunctionArbitrary],
])

export default generateArbitrary
