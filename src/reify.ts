import ts from 'typescript'
import type { Arbitrary } from './arbitrary.ts'
import { fcCall } from './fast-check.ts'

const reifyArbitrary = (arbitrary: Arbitrary): ts.Expression => {
  switch (arbitrary.type) {
    case `never`:
      return ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          fcCall(`constant`, [literal(`never`)]),
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
                `message`,
              ),
            ],
            undefined,
            undefined,
            ts.factory.createBlock([
              ts.factory.createThrowStatement(
                ts.factory.createNewExpression(global(`Error`), undefined, [
                  ts.factory.createIdentifier(`message`),
                ]),
              ),
            ]),
          ),
        ],
      )
    case `constant`:
      return fcCall(`constant`, [literal(arbitrary.value)])
    case `boolean`:
      return fcCall(`boolean`)
    case `double`:
      return fcCall(`double`)
    case `bigInt`:
      return fcCall(`bigInt`)
    case `string`:
      return fcCall(`string`)
    case `stringMatching`:
      return fcCall(`stringMatching`, [
        ts.factory.createRegularExpressionLiteral(`/^${arbitrary.regex}$/u`),
      ])
    case `symbol`:
      return ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          fcCall(`string`),
          ts.factory.createIdentifier(`map`),
        ),
        undefined,
        [global(`Symbol`)],
      )
    case `array`:
      return fcCall(`array`, [reifyArbitrary(arbitrary.items)])
    case `tuple`:
      return fcCall(`tuple`, arbitrary.elements.map(reifyArbitrary))
    case `record`: {
      const properties = [...arbitrary.properties]
      const requiredPropertyNames = properties.flatMap(
        ([name, { required }]) => (required ? [name] : []),
      )
      return fcCall(`record`, [
        ts.factory.createObjectLiteralExpression(
          properties.map(([name, { arbitrary }]) =>
            ts.factory.createPropertyAssignment(
              ts.factory.createComputedPropertyName(literal(name)),
              reifyArbitrary(arbitrary),
            ),
          ),
        ),
        ...(requiredPropertyNames.length > 0 &&
        requiredPropertyNames.length < properties.length
          ? [literal({ requiredKeys: requiredPropertyNames })]
          : []),
      ])
    }
    case `object`:
      return fcCall(`object`)
    case `func`:
      return fcCall(`func`, [reifyArbitrary(arbitrary.result)])
    case `option`:
      return fcCall(`option`, [
        reifyArbitrary(arbitrary.arbitrary),
        ...(arbitrary.nil === undefined ? [literal({ nil: undefined })] : []),
      ])
    case `constantFrom`:
      return fcCall(`constantFrom`, arbitrary.constants.map(literal))
    case `oneof`:
      return fcCall(`oneof`, arbitrary.variants.map(reifyArbitrary))
    case `anything`:
      return fcCall(`anything`)
  }
}

const literal = (value: unknown): ts.Expression => {
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
        global(`Symbol`),
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
        return ts.factory.createArrayLiteralExpression(value.map(literal))
      }
      return ts.factory.createObjectLiteralExpression(
        Object.entries(value).map(([name, value]) =>
          ts.factory.createPropertyAssignment(name, literal(value)),
        ),
      )
    case `function`:
      throw new Error(`Unsupported type`)
  }
}

const global = (name: string): ts.PropertyAccessExpression =>
  ts.factory.createPropertyAccessExpression(
    ts.factory.createIdentifier(`globalThis`),
    name,
  )

export default reifyArbitrary
