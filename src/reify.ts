import ts from 'typescript'
import { collectTieArbitraries } from './arbitrary.ts'
import type {
  Arbitrary,
  ArrayArbitrary,
  AssignArbitrary,
  ConstantArbitrary,
  ConstantFromArbitrary,
  DictionaryArbitrary,
  FuncArbitrary,
  MapStringArbitrary,
  MetaArbitrary,
  OneofArbitrary,
  OptionArbitrary,
  RecordArbitrary,
  TemplateArbitrary,
  TieArbitrary,
  TupleArbitrary,
} from './arbitrary.ts'
import { fcCallExpression } from './fast-check.ts'

export const reifyArbitrary = (arbitrary: Arbitrary): ts.Expression => {
  const tieArbitraryNames = assignTieArbitraryNames(arbitrary)
  if (tieArbitraryNames.size === 0) {
    return reifyArbitraryInternal(arbitrary, tieArbitraryNames)
  }

  const propertyAssignments = Array.from(
    tieArbitraryNames,
    ([tieArbitrary, name]) =>
      ts.factory.createPropertyAssignment(
        name,
        reifyArbitraryInternal(tieArbitrary.arbitrary, tieArbitraryNames),
      ),
  )

  let arbIdentifier: string
  if (arbitrary.type === `tie`) {
    arbIdentifier = tieArbitraryNames.get(arbitrary)!
  } else {
    arbIdentifier = `arb`
    propertyAssignments.push(
      ts.factory.createPropertyAssignment(
        arbIdentifier,
        reifyArbitraryInternal(arbitrary, tieArbitraryNames),
      ),
    )
  }

  return ts.factory.createPropertyAccessExpression(
    fcCallExpression(`letrec`, [
      ts.factory.createArrowFunction(
        undefined,
        undefined,
        [ts.factory.createParameterDeclaration(undefined, undefined, `tie`)],
        undefined,
        undefined,
        ts.factory.createObjectLiteralExpression(propertyAssignments),
      ),
    ]),
    arbIdentifier,
  )
}

const assignTieArbitraryNames = (
  arbitrary: Arbitrary,
): Map<TieArbitrary, string> => {
  const tieArbitraryNames = new Map<TieArbitrary, string>()
  for (const tieArbitrary of collectTieArbitraries(arbitrary)) {
    tieArbitraryNames.set(tieArbitrary, `arb${tieArbitraryNames.size}`)
  }
  return tieArbitraryNames
}

const reifyArbitraryInternal = (
  arbitrary: Arbitrary,
  tieArbitraryNames: Map<TieArbitrary, string>,
  constraintsExpression?: ts.Expression,
): ts.Expression => {
  switch (arbitrary.type) {
    case `mutable`:
      throw new Error(`Unsupported type`)
    case `never`:
      return neverArbitraryExpression()
    case `meta`:
      return metaArbitraryExpression(arbitrary, tieArbitraryNames)
    case `constant`:
      return constantArbitraryExpression(arbitrary)
    case `boolean`:
      return booleanArbitraryExpression(constraintsExpression)
    case `integer`:
      return integerArbitraryExpression(constraintsExpression)
    case `double`:
      return doubleArbitraryExpression(constraintsExpression)
    case `bigInt`:
      return bigIntArbitraryExpression(constraintsExpression)
    case `string`:
      return stringArbitraryExpression(constraintsExpression)
    case `template`:
      return templateArbitraryExpression(arbitrary, tieArbitraryNames)
    case `mapString`:
      return mapStringArbitraryExpression(arbitrary, tieArbitraryNames)
    case `symbol`:
      return symbolArbitraryExpression(constraintsExpression)
    case `array`:
      return arrayArbitraryExpression(
        arbitrary,
        tieArbitraryNames,
        constraintsExpression,
      )
    case `tuple`:
      return tupleArbitraryExpression(arbitrary, tieArbitraryNames)
    case `record`:
      return recordArbitraryExpression(arbitrary, tieArbitraryNames)
    case `dictionary`:
      return dictionaryArbitraryExpression(arbitrary, tieArbitraryNames)
    case `object`:
      return objectArbitraryExpression()
    case `func`:
      return funcArbitraryExpression(arbitrary, tieArbitraryNames)
    case `option`:
      return optionArbitraryExpression(arbitrary, tieArbitraryNames)
    case `constantFrom`:
      return constantFromArbitraryExpression(arbitrary)
    case `oneof`:
      return oneofArbitraryExpression(arbitrary, tieArbitraryNames)
    case `assign`:
      return assignArbitraryExpression(arbitrary, tieArbitraryNames)
    case `anything`:
      return anythingArbitraryExpression()
    case `tie`:
      return tieArbitraryExpression(arbitrary, tieArbitraryNames)
  }
}

const neverArbitraryExpression = (): ts.Expression =>
  mapArbitraryExpression(
    fcCallExpression(`constant`, [literalExpression(`never`)]),
    valueIdentifier =>
      ts.factory.createBlock([
        ts.factory.createThrowStatement(
          ts.factory.createNewExpression(
            globalThisExpression(`Error`),
            undefined,
            [valueIdentifier],
          ),
        ),
      ]),
  )

const metaArbitraryExpression = (
  arbitrary: MetaArbitrary,
  tieArbitraryNames: Map<TieArbitrary, string>,
): ts.Expression =>
  reifyArbitraryInternal(
    arbitrary.arbitrary,
    tieArbitraryNames,
    arbitrary.meta.constraints === undefined
      ? undefined
      : literalExpression(arbitrary.meta.constraints),
  )

const constantArbitraryExpression = (
  arbitrary: ConstantArbitrary,
): ts.Expression =>
  fcCallExpression(`constant`, [literalExpression(arbitrary.value)])

const booleanArbitraryExpression = (
  constraintsExpression: ts.Expression | undefined,
) => fcCallExpression(`boolean`, [constraintsExpression])

const integerArbitraryExpression = (
  constraintsExpression: ts.Expression | undefined,
) => fcCallExpression(`integer`, [constraintsExpression])

const doubleArbitraryExpression = (
  constraintsExpression: ts.Expression | undefined,
) => fcCallExpression(`double`, [constraintsExpression])

const bigIntArbitraryExpression = (
  constraintsExpression: ts.Expression | undefined,
) => fcCallExpression(`bigInt`, [constraintsExpression])

const stringArbitraryExpression = (
  constraintsExpression: ts.Expression | undefined,
) => fcCallExpression(`string`, [constraintsExpression])

const templateArbitraryExpression = (
  arbitrary: TemplateArbitrary,
  tieArbitraryNames: Map<TieArbitrary, string>,
): ts.Expression => {
  const arbitraryExpressions = arbitrary.segments
    .filter(segment => typeof segment !== `string`)
    .map(arbitrary => reifyArbitraryInternal(arbitrary, tieArbitraryNames))
  return mapArbitraryExpression(
    arbitraryExpressions.length === 1
      ? arbitraryExpressions[0]!
      : fcCallExpression(`tuple`, arbitraryExpressions),
    valueIdentifier => {
      let [head, index] =
        arbitrary.segments.length === 0 ||
        typeof arbitrary.segments[0] !== `string`
          ? [ts.factory.createTemplateHead(``), 0]
          : [ts.factory.createTemplateHead(arbitrary.segments[0]), 1]

      const spans: ts.TemplateSpan[] = []
      let arbitraryIndex = 0
      while (index < arbitrary.segments.length) {
        const arbitraryExpression =
          arbitraryExpressions.length === 1
            ? valueIdentifier
            : ts.factory.createElementAccessExpression(
                valueIdentifier,
                arbitraryIndex++,
              )
        index++

        if (index === arbitrary.segments.length) {
          spans.push(
            ts.factory.createTemplateSpan(
              arbitraryExpression,
              ts.factory.createTemplateTail(``),
            ),
          )
          continue
        }

        const nextSegment = arbitrary.segments[index]!
        if (typeof nextSegment === `string`) {
          index++
          spans.push(
            ts.factory.createTemplateSpan(
              arbitraryExpression,
              index === arbitrary.segments.length
                ? ts.factory.createTemplateTail(nextSegment)
                : ts.factory.createTemplateMiddle(nextSegment),
            ),
          )
          continue
        }

        spans.push(
          ts.factory.createTemplateSpan(
            arbitraryExpression,
            ts.factory.createTemplateMiddle(``),
          ),
        )
      }

      return ts.factory.createTemplateExpression(head, spans)
    },
  )
}

const mapStringArbitraryExpression = (
  arbitrary: MapStringArbitrary,
  tieArbitraryNames: Map<TieArbitrary, string>,
) =>
  mapArbitraryExpression(
    reifyArbitraryInternal(arbitrary.arbitrary, tieArbitraryNames),
    valueIdentifier => {
      // See `applyStringMapping` here:
      // https://raw.githubusercontent.com/microsoft/TypeScript/refs/heads/main/src/compiler/checker.ts
      switch (arbitrary.operation) {
        case `uppercase`:
        case `lowercase`:
          return ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
              valueIdentifier,
              arbitrary.operation === `uppercase`
                ? `toUpperCase`
                : `toLowerCase`,
            ),
            undefined,
            undefined,
          )
        case `capitalize`:
        case `uncapitalize`: {
          const firstCharacterExpression = ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
              valueIdentifier,
              `charAt`,
            ),
            undefined,
            [literalExpression(0)],
          )
          return ts.factory.createBinaryExpression(
            ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(
                firstCharacterExpression,
                arbitrary.operation === `capitalize`
                  ? `toUpperCase`
                  : `toLowerCase`,
              ),
              undefined,
              undefined,
            ),
            ts.SyntaxKind.PlusToken,
            ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(
                valueIdentifier,
                `slice`,
              ),
              undefined,
              [literalExpression(1)],
            ),
          )
        }
      }
    },
  )

const symbolArbitraryExpression = (
  constraintsExpression: ts.Expression | undefined,
) =>
  mapArbitraryExpression(
    fcCallExpression(`string`, [constraintsExpression]),
    valueIdentifier =>
      ts.factory.createCallExpression(
        globalThisExpression(`Symbol`),
        undefined,
        [valueIdentifier],
      ),
  )

const arrayArbitraryExpression = (
  arbitrary: ArrayArbitrary,
  tieArbitraryNames: Map<TieArbitrary, string>,
  constraintsExpression: ts.Expression | undefined,
) =>
  fcCallExpression(`array`, [
    reifyArbitraryInternal(arbitrary.items, tieArbitraryNames),
    constraintsExpression,
  ])

const tupleArbitraryExpression = (
  arbitrary: TupleArbitrary,
  tieArbitraryNames: Map<TieArbitrary, string>,
) => {
  const tupleArbitraryExpression = fcCallExpression(
    `tuple`,
    arbitrary.elements.map(({ arbitrary }) =>
      reifyArbitraryInternal(arbitrary, tieArbitraryNames),
    ),
  )
  if (arbitrary.elements.every(({ rest }) => !rest)) {
    return tupleArbitraryExpression
  }

  return mapArbitraryExpression(tupleArbitraryExpression, valueIdentifier =>
    ts.factory.createArrayLiteralExpression(
      arbitrary.elements.map(({ rest }, index) => {
        const elementExpression = ts.factory.createElementAccessExpression(
          valueIdentifier,
          index,
        )
        return rest
          ? ts.factory.createSpreadElement(elementExpression)
          : elementExpression
      }),
    ),
  )
}

const recordArbitraryExpression = (
  arbitrary: RecordArbitrary,
  tieArbitraryNames: Map<TieArbitrary, string>,
) => {
  const properties = [...arbitrary.properties]
  const requiredPropertyNames = properties.flatMap(([name, { required }]) =>
    required ? [name] : [],
  )
  return fcCallExpression(`record`, [
    ts.factory.createObjectLiteralExpression(
      properties.map(([name, { arbitrary }]) =>
        ts.factory.createPropertyAssignment(
          typeof name === `string`
            ? name
            : ts.factory.createComputedPropertyName(literalExpression(name)),
          reifyArbitraryInternal(arbitrary, tieArbitraryNames),
        ),
      ),
    ),
    ...(requiredPropertyNames.length > 0 &&
    requiredPropertyNames.length < properties.length
      ? [literalExpression({ requiredKeys: requiredPropertyNames })]
      : []),
  ])
}

const dictionaryArbitraryExpression = (
  arbitrary: DictionaryArbitrary,
  tieArbitraryNames: Map<TieArbitrary, string>,
) => {
  let keyArbitraryExpression = reifyArbitraryInternal(
    arbitrary.key,
    tieArbitraryNames,
  )
  if (!isStringArbitrary(arbitrary.key)) {
    keyArbitraryExpression = mapArbitraryExpression(
      keyArbitraryExpression,
      valueIdentifier =>
        ts.factory.createCallExpression(
          globalThisExpression(`String`),
          undefined,
          [valueIdentifier],
        ),
    )
  }

  return fcCallExpression(`dictionary`, [
    keyArbitraryExpression,
    reifyArbitraryInternal(arbitrary.value, tieArbitraryNames),
  ])
}

const isStringArbitrary = (arbitrary: Arbitrary): boolean => {
  switch (arbitrary.type) {
    case `tie`:
    case `meta`:
      return isStringArbitrary(arbitrary.arbitrary)
    case `never`:
    case `string`:
    case `template`:
    case `mapString`:
      return true
    case `constant`:
      return typeof arbitrary.value === `string`
    case `constantFrom`:
      return arbitrary.constants.every(value => typeof value === `string`)
    case `oneof`:
      return arbitrary.variants.every(isStringArbitrary)
    case `mutable`:
    case `option`:
    case `boolean`:
    case `integer`:
    case `double`:
    case `bigInt`:
    case `symbol`:
    case `array`:
    case `tuple`:
    case `record`:
    case `dictionary`:
    case `object`:
    case `func`:
    case `assign`:
    case `anything`:
      return false
  }
}

const objectArbitraryExpression = () => fcCallExpression(`object`)

const funcArbitraryExpression = (
  arbitrary: FuncArbitrary,
  tieArbitraryNames: Map<TieArbitrary, string>,
) =>
  fcCallExpression(`func`, [
    reifyArbitraryInternal(arbitrary.result, tieArbitraryNames),
  ])

const optionArbitraryExpression = (
  arbitrary: OptionArbitrary,
  tieArbitraryNames: Map<TieArbitrary, string>,
) =>
  fcCallExpression(`option`, [
    reifyArbitraryInternal(arbitrary.arbitrary, tieArbitraryNames),
    ...(arbitrary.nil === undefined
      ? [literalExpression({ nil: undefined })]
      : []),
  ])

const constantFromArbitraryExpression = (arbitrary: ConstantFromArbitrary) =>
  fcCallExpression(`constantFrom`, arbitrary.constants.map(literalExpression))

const oneofArbitraryExpression = (
  arbitrary: OneofArbitrary,
  tieArbitraryNames: Map<TieArbitrary, string>,
) =>
  fcCallExpression(
    `oneof`,
    arbitrary.variants.map(variant =>
      reifyArbitraryInternal(variant, tieArbitraryNames),
    ),
  )

const assignArbitraryExpression = (
  arbitrary: AssignArbitrary,
  tieArbitraryNames: Map<TieArbitrary, string>,
) =>
  mapArbitraryExpression(
    fcCallExpression(
      `tuple`,
      arbitrary.arbitraries.map(arbitrary =>
        reifyArbitraryInternal(arbitrary, tieArbitraryNames),
      ),
    ),
    valueIdentifier =>
      ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          globalThisExpression(`Object`),
          `assign`,
        ),
        undefined,
        [ts.factory.createSpreadElement(valueIdentifier)],
      ),
  )

const anythingArbitraryExpression = () => fcCallExpression(`anything`)

const tieArbitraryExpression = (
  arbitrary: TieArbitrary,
  tieArbitraryNames: Map<TieArbitrary, string>,
) => {
  const name = tieArbitraryNames.get(arbitrary)
  if (name === undefined) {
    throw new Error(`Invalid state`)
  }
  return ts.factory.createCallExpression(
    ts.factory.createIdentifier(`tie`),
    undefined,
    [literalExpression(name)],
  )
}

const mapArbitraryExpression = (
  arbitraryExpression: ts.Expression,
  mapperExpression: (value: ts.Identifier) => ts.ConciseBody,
): ts.Expression => {
  const valueIdentifier = ts.factory.createIdentifier(`value`)
  return ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      arbitraryExpression,
      ts.factory.createIdentifier(`map`),
    ),
    undefined,
    [
      ts.factory.createArrowFunction(
        undefined,
        undefined,
        [
          ts.factory.createParameterDeclaration(
            undefined,
            undefined,
            valueIdentifier,
          ),
        ],
        undefined,
        undefined,
        mapperExpression(valueIdentifier),
      ),
    ],
  )
}

const literalExpression = (value: unknown): ts.Expression => {
  switch (typeof value) {
    case `undefined`:
      return ts.factory.createIdentifier(`undefined`)
    case `boolean`:
      return value ? ts.factory.createTrue() : ts.factory.createFalse()
    case `number`:
      return value >= 0
        ? ts.factory.createNumericLiteral(value)
        : ts.factory.createPrefixUnaryExpression(
            ts.SyntaxKind.MinusToken,
            ts.factory.createNumericLiteral(Math.abs(value)),
          )
    case `bigint`:
      return ts.factory.createBigIntLiteral(`${value}n`)
    case `string`:
      return ts.factory.createStringLiteral(value)
    case `symbol`:
      return ts.factory.createCallExpression(
        globalThisExpression(`Symbol`),
        undefined,
        value.description
          ? [ts.factory.createStringLiteral(value.description)]
          : [],
      )
    case `object`:
      if (value === null) {
        return ts.factory.createNull()
      }
      if (Array.isArray(value)) {
        return ts.factory.createArrayLiteralExpression(
          value.map(literalExpression),
        )
      }
      return ts.factory.createObjectLiteralExpression(
        Object.entries(value).map(([name, value]) =>
          ts.factory.createPropertyAssignment(name, literalExpression(value)),
        ),
      )
    case `function`:
      throw new Error(`Unsupported type`)
  }
}

const globalThisExpression = (name: string): ts.PropertyAccessExpression =>
  ts.factory.createPropertyAccessExpression(
    ts.factory.createIdentifier(`globalThis`),
    name,
  )

export default reifyArbitrary
