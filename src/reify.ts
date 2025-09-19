import ts from 'typescript'
import type { Arbitrary } from './arbitrary.ts'
import { fcCall } from './fast-check.ts'

const reifyArbitrary = (arbitrary: Arbitrary): ts.Expression => {
  switch (arbitrary.type) {
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
    case `symbol`:
      return ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          fcCall(`string`),
          ts.factory.createIdentifier(`map`),
        ),
        undefined,
        [global(`Symbol`)],
      )
    case `record`: {
      const properties = Object.entries(arbitrary.properties)
      const requiredPropertyNames = properties.flatMap(
        ([name, { required }]) => (required ? [name] : []),
      )
      return fcCall(`record`, [
        ts.factory.createObjectLiteralExpression(
          properties.map(([name, { arbitrary }]) =>
            ts.factory.createPropertyAssignment(
              name,
              reifyArbitrary(arbitrary),
            ),
          ),
        ),
        ...(requiredPropertyNames.length > 0 &&
        requiredPropertyNames.length < properties.length
          ? [
              ts.factory.createObjectLiteralExpression([
                ts.factory.createPropertyAssignment(
                  `requiredKeys`,
                  ts.factory.createArrayLiteralExpression(
                    requiredPropertyNames.map(literal),
                  ),
                ),
              ]),
            ]
          : []),
      ])
    }
    case `object`:
      return fcCall(`object`)
    case `option`:
      return fcCall(`option`, [reifyArbitrary(arbitrary.arbitrary)])
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
      return ts.factory.createNumericLiteral(value)
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
      return value === null
        ? ts.factory.createNull()
        : ts.factory.createObjectLiteralExpression(
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
