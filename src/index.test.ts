import { fc, test } from '@fast-check/vitest'
import { expect } from 'vitest'
import typeToArbitrary from './index.js'

test.each([
  {
    name: `any`,
    typeToArbitrary: () => typeToArbitrary<any>(),
    expectedArb: fc.anything(),
  },
  {
    name: `unknown`,
    typeToArbitrary: () => typeToArbitrary<unknown>(),
    expectedArb: fc.anything(),
  },
  {
    name: `void`,
    // eslint-disable-next-line typescript/no-invalid-void-type
    typeToArbitrary: () => typeToArbitrary<void>(),
    expectedArb: fc.constant(undefined),
  },
  {
    name: `undefined`,
    typeToArbitrary: () => typeToArbitrary<undefined>(),
    expectedArb: fc.constant(undefined),
  },
  {
    name: `boolean`,
    typeToArbitrary: () => typeToArbitrary<boolean>(),
    expectedArb: fc.boolean(),
  },
  {
    name: `false`,
    typeToArbitrary: () => typeToArbitrary<false>(),
    expectedArb: fc.constant(false),
  },
  {
    name: `true`,
    typeToArbitrary: () => typeToArbitrary<true>(),
    expectedArb: fc.constant(true),
  },
  {
    name: `number`,
    typeToArbitrary: () => typeToArbitrary<number>(),
    expectedArb: fc.double(),
  },
  {
    name: `integer literal`,
    typeToArbitrary: () => typeToArbitrary<1>(),
    expectedArb: fc.constant(1),
  },
  {
    name: `decimal literal`,
    typeToArbitrary: () => typeToArbitrary<1.5>(),
    expectedArb: fc.constant(1.5),
  },
  {
    name: `bigint`,
    typeToArbitrary: () => typeToArbitrary<bigint>(),
    expectedArb: fc.bigInt(),
  },
  {
    name: `bigint literal`,
    typeToArbitrary: () => typeToArbitrary<1n>(),
    expectedArb: fc.constant(1n),
  },
  {
    name: `string`,
    typeToArbitrary: () => typeToArbitrary<string>(),
    expectedArb: fc.string(),
  },
  {
    name: `string literal`,
    // eslint-disable-next-line stylistic/quotes
    typeToArbitrary: () => typeToArbitrary<'Hello World!'>(),
    expectedArb: fc.constant(`Hello World!`),
  },
  {
    name: `symbol`,
    typeToArbitrary: () => typeToArbitrary<symbol>(),
    expectedArb: fc.string().map(Symbol),
    stringify: true,
  },
  {
    name: `array`,
    typeToArbitrary: () => typeToArbitrary<string[]>(),
    expectedArb: fc.array(fc.string()),
  },
  {
    name: `array interface`,
    // eslint-disable-next-line typescript/array-type
    typeToArbitrary: () => typeToArbitrary<Array<string>>(),
    expectedArb: fc.array(fc.string()),
  },
  {
    name: `readonly array`,
    typeToArbitrary: () => typeToArbitrary<readonly string[]>(),
    expectedArb: fc.array(fc.string()),
  },
  {
    name: `readonly array interface`,
    // eslint-disable-next-line typescript/array-type
    typeToArbitrary: () => typeToArbitrary<ReadonlyArray<string>>(),
    expectedArb: fc.array(fc.string()),
  },
  {
    name: `object`,
    typeToArbitrary: () => typeToArbitrary<object>(),
    expectedArb: fc.object(),
  },
  {
    name: `object literal`,
    typeToArbitrary: () => typeToArbitrary<{ a: string; b: number }>(),
    expectedArb: fc.record({ a: fc.string(), b: fc.double() }),
  },
  {
    name: `object literal with undefined`,
    typeToArbitrary: () =>
      typeToArbitrary<{ a: string; b: number | undefined }>(),
    expectedArb: fc.record({
      a: fc.string(),
      b: fc.option(fc.double(), { nil: undefined }),
    }),
  },
  {
    name: `object literal with optionals`,
    typeToArbitrary: () => typeToArbitrary<{ a: string; b?: number }>(),
    expectedArb: fc.record(
      { a: fc.string(), b: fc.option(fc.double(), { nil: undefined }) },
      { requiredKeys: [`a`] },
    ),
  },
  {
    name: `union of false and true`,
    typeToArbitrary: () => typeToArbitrary<false | true>(),
    expectedArb: fc.boolean(),
  },
  {
    name: `union of true and false`,
    typeToArbitrary: () => typeToArbitrary<true | false>(),
    expectedArb: fc.boolean(),
  },
  {
    name: `union of integer constants`,
    typeToArbitrary: () => typeToArbitrary<1 | 3 | 2 | 4>(),
    expectedArb: fc.constantFrom(1, 2, 3, 4),
  },
  {
    name: `union of bigint constants`,
    typeToArbitrary: () => typeToArbitrary<1n | 3n | 2n | 4n>(),
    expectedArb: fc.constantFrom(1n, 2n, 3n, 4n),
  },
  {
    name: `union of string constants`,
    // eslint-disable-next-line stylistic/quotes
    typeToArbitrary: () => typeToArbitrary<'b' | 'a' | 'd' | 'c'>(),
    expectedArb: fc.constantFrom(`a`, `b`, `c`, `d`),
  },
  {
    name: `union of string and undefined`,
    typeToArbitrary: () => typeToArbitrary<string | undefined>(),
    expectedArb: fc.option(fc.string(), { nil: undefined }),
  },
  {
    name: `union of string and null`,
    typeToArbitrary: () => typeToArbitrary<string | null>(),
    expectedArb: fc.option(fc.string()),
  },
  {
    name: `union of string, undefined, and null`,
    typeToArbitrary: () => typeToArbitrary<string | undefined | null>(),
    expectedArb: fc.oneof(fc.string(), fc.constantFrom(null, undefined)),
  },
  {
    name: `union of string and number`,
    typeToArbitrary: () => typeToArbitrary<string | number>(),
    expectedArb: fc.oneof(fc.string(), fc.double()),
  },
  {
    name: `unconstrained type parameter`,
    typeToArbitrary: <T>() => typeToArbitrary<T>(),
    expectedArb: fc.anything(),
  },
  {
    name: `constrained type parameter`,
    typeToArbitrary: <T extends string>() => typeToArbitrary<T>(),
    expectedArb: fc.string(),
  },
  // {
  //   name: `this`,
  //   typeToArbitrary: () => {
  //     class Class {
  //       // eslint-disable-next-line typescript/class-methods-use-this
  //       public arb() {
  //         return typeToArbitrary<this>()
  //       }
  //     }
  //     return new Class().arb()
  //   },
  //   expectedArb: fc.string(),
  // },
])(
  `typeToArbitrary transforms $name types`,
  ({ typeToArbitrary, expectedArb, stringify }) => {
    const arb = typeToArbitrary()

    expect(sample(arb, stringify)).toStrictEqual(sample(expectedArb, stringify))
  },
)

const sample = <T>(arb: fc.Arbitrary<T>, stringify = false): unknown[] => {
  const samples = fc.sample(arb, { seed: 42, numRuns: 5 })
  return stringify ? samples.map(fc.stringify) : samples
}
