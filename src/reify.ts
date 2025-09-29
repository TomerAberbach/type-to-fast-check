import ts from 'typescript'
import type {
  Arbitrary,
  ArrayArbitrary,
  AssignArbitrary,
  ConstantArbitrary,
  ConstantFromArbitrary,
  DoubleArbitrary,
  FuncArbitrary,
  OneofArbitrary,
  OptionArbitrary,
  RecordArbitrary,
  TemplateArbitrary,
  TupleArbitrary,
} from './arbitrary.ts'
import { fcCallExpression } from './fast-check.ts'

const reifyArbitrary = (arbitrary: Arbitrary): ts.Expression => {
  switch (arbitrary.type) {
    case `never`:
      return neverArbitraryExpression()
    case `constant`:
      return constantArbitraryExpression(arbitrary)
    case `boolean`:
      return booleanArbitraryExpression()
    case `double`:
      return doubleArbitraryExpression(arbitrary)
    case `bigInt`:
      return bigIntArbitraryExpression()
    case `string`:
      return stringArbitraryExpression()
    case `template`:
      return templateArbitraryExpression(arbitrary)
    case `symbol`:
      return symbolArbitraryExpression()
    case `array`:
      return arrayArbitraryExpression(arbitrary)
    case `tuple`:
      return tupleArbitraryExpression(arbitrary)
    case `record`:
      return recordArbitraryExpression(arbitrary)
    case `object`:
      return objectArbitraryExpression()
    case `func`:
      return funcArbitraryExpression(arbitrary)
    case `option`:
      return optionArbitraryExpression(arbitrary)
    case `constantFrom`:
      return constantFromArbitraryExpression(arbitrary)
    case `oneof`:
      return oneofArbitraryExpression(arbitrary)
    case `assign`:
      return assignArbitraryExpression(arbitrary)
    case `anything`:
      return anythingArbitraryExpression()
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

const constantArbitraryExpression = (
  arbitrary: ConstantArbitrary,
): ts.Expression =>
  fcCallExpression(`constant`, [literalExpression(arbitrary.value)])

const booleanArbitraryExpression = () => fcCallExpression(`boolean`)

const doubleArbitraryExpression = (arbitrary: DoubleArbitrary) =>
  fcCallExpression(
    `double`,
    arbitrary.constraints ? [literalExpression(arbitrary.constraints)] : [],
  )

const bigIntArbitraryExpression = () => fcCallExpression(`bigInt`)

const stringArbitraryExpression = () => fcCallExpression(`string`)

const templateArbitraryExpression = (
  arbitrary: TemplateArbitrary,
): ts.Expression => {
  const arbitraryExpressions = arbitrary.segments
    .filter(segment => typeof segment !== `string`)
    .map(reifyArbitrary)
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

const symbolArbitraryExpression = () =>
  mapArbitraryExpression(fcCallExpression(`string`), valueIdentifier =>
    ts.factory.createCallExpression(globalThisExpression(`Symbol`), undefined, [
      valueIdentifier,
    ]),
  )

const arrayArbitraryExpression = (arbitrary: ArrayArbitrary) =>
  fcCallExpression(`array`, [reifyArbitrary(arbitrary.items)])

const tupleArbitraryExpression = (arbitrary: TupleArbitrary) =>
  fcCallExpression(`tuple`, arbitrary.elements.map(reifyArbitrary))

const recordArbitraryExpression = (arbitrary: RecordArbitrary) => {
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
          reifyArbitrary(arbitrary),
        ),
      ),
    ),
    ...(requiredPropertyNames.length > 0 &&
    requiredPropertyNames.length < properties.length
      ? [literalExpression({ requiredKeys: requiredPropertyNames })]
      : []),
  ])
}

const objectArbitraryExpression = () => fcCallExpression(`object`)

const funcArbitraryExpression = (arbitrary: FuncArbitrary) =>
  fcCallExpression(`func`, [reifyArbitrary(arbitrary.result)])

const optionArbitraryExpression = (arbitrary: OptionArbitrary) =>
  fcCallExpression(`option`, [
    reifyArbitrary(arbitrary.arbitrary),
    ...(arbitrary.nil === undefined
      ? [literalExpression({ nil: undefined })]
      : []),
  ])

const constantFromArbitraryExpression = (arbitrary: ConstantFromArbitrary) =>
  fcCallExpression(`constantFrom`, arbitrary.constants.map(literalExpression))

const oneofArbitraryExpression = (arbitrary: OneofArbitrary) =>
  fcCallExpression(`oneof`, arbitrary.variants.map(reifyArbitrary))

const assignArbitraryExpression = (arbitrary: AssignArbitrary) =>
  mapArbitraryExpression(
    fcCallExpression(`tuple`, [
      reifyArbitrary(arbitrary.target),
      reifyArbitrary(arbitrary.source),
    ]),
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
