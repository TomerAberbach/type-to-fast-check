/* eslint-disable typescript/no-redundant-type-constituents */
/* eslint-disable stylistic/quotes */

import * as fc from 'fast-check'

declare const typeToArbitrary: <T>() => fc.Arbitrary<T>

type TestCase<T = unknown> = {
  actual: fc.Arbitrary<T>
  expected: fc.Arbitrary<T>
  stringify?: boolean
}

const testCases: TestCase[] = []

/** For type-safety between actual and expected arbitrary types. */
const define = <T>(testCase: {
  actual: fc.Arbitrary<T>
  expected: fc.Arbitrary<T>
  stringify?: boolean
}) => {
  testCases.push(testCase)
}

const neverArb = fc.constant(`never`).map(message => {
  throw new Error(message)
})

define({ actual: typeToArbitrary<never>(), expected: neverArb })

// eslint-disable-next-line typescript/no-invalid-void-type
define({ actual: typeToArbitrary<void>(), expected: fc.constant(undefined) })

define({
  actual: typeToArbitrary<undefined>(),
  expected: fc.constant(undefined),
})

define({ actual: typeToArbitrary<boolean>(), expected: fc.boolean() })

define({ actual: typeToArbitrary<false>(), expected: fc.constant(false) })

define({ actual: typeToArbitrary<true>(), expected: fc.constant(true) })

define({ actual: typeToArbitrary<number>(), expected: fc.double() })

define({ actual: typeToArbitrary<1>(), expected: fc.constant(1) })

define({ actual: typeToArbitrary<1.5>(), expected: fc.constant(1.5) })

define({ actual: typeToArbitrary<bigint>(), expected: fc.bigInt() })

define({ actual: typeToArbitrary<1n>(), expected: fc.constant(1n) })

define({ actual: typeToArbitrary<string>(), expected: fc.string() })

define({
  actual: typeToArbitrary<'Hello World!'>(),
  expected: fc.constant(`Hello World!`),
})

define({
  actual: typeToArbitrary<symbol>(),
  expected: fc.string().map(Symbol),
  stringify: true,
})

const _symbol: unique symbol = Symbol('unique')

define({
  actual: typeToArbitrary<typeof _symbol>(),
  expected: fc.string().map(Symbol),
  stringify: true,
})

define({
  actual: typeToArbitrary<string[]>(),
  expected: fc.array(fc.string()),
})

define({
  // eslint-disable-next-line typescript/array-type
  actual: typeToArbitrary<Array<string>>(),
  expected: fc.array(fc.string()),
})

define({
  actual: typeToArbitrary<readonly string[]>(),
  expected: fc.array(fc.string()),
})

define({
  // eslint-disable-next-line typescript/array-type
  actual: typeToArbitrary<ReadonlyArray<string>>(),
  expected: fc.array(fc.string()),
})

define({
  actual: typeToArbitrary<[string, number]>(),
  expected: fc.tuple(fc.string(), fc.double()),
})

define({
  actual: typeToArbitrary<{ a: string; b: number }>(),
  expected: fc.record({ a: fc.string(), b: fc.double() }),
})

define({
  actual: typeToArbitrary<{ a: string; b: number | undefined }>(),
  expected: fc.record({
    a: fc.string(),
    b: fc.option(fc.double(), { nil: undefined }),
  }),
})

define({
  actual: typeToArbitrary<{ a: string; b?: number }>(),
  expected: fc.record(
    { a: fc.string(), b: fc.option(fc.double(), { nil: undefined }) },
    { requiredKeys: [`a`] },
  ),
})

define({
  actual: typeToArbitrary<object>(),
  expected: fc.object(),
})

define({
  actual: typeToArbitrary<() => string>(),
  expected: fc.func(fc.string()),
  stringify: true,
})

define({
  // eslint-disable-next-line typescript/no-unsafe-function-type
  actual: typeToArbitrary<Function>(),
  expected: fc.func(fc.anything()),
  stringify: true,
})

enum StringEnum {
  B = 'b',
  A = 'a',
  C = 'c',
}

define({
  actual: typeToArbitrary<StringEnum>(),
  expected: fc.constantFrom(`a`, `b`, `c`),
})

define({
  actual: typeToArbitrary<StringEnum.C>(),
  expected: fc.constant(`c`),
})

enum IntEnum {
  B = 1,
  A = 0,
  C = 2,
}

define({
  actual: typeToArbitrary<IntEnum>(),
  expected: fc.constantFrom(0, 1, 2),
})

define({
  actual: typeToArbitrary<IntEnum.C>(),
  expected: fc.constant(2),
})

enum ImplicitIntEnum {
  A,
  B,
  C,
}

define({
  actual: typeToArbitrary<ImplicitIntEnum>(),
  expected: fc.constantFrom(0, 1, 2),
})

define({
  actual: typeToArbitrary<ImplicitIntEnum.B>(),
  expected: fc.constant(1),
})

enum PartiallyImplicitIntEnum {
  A = 4,
  B,
  C = 2,
  D,
}

define({
  actual: typeToArbitrary<PartiallyImplicitIntEnum>(),
  expected: fc.constantFrom(2, 3, 4, 5),
})

define({
  actual: typeToArbitrary<PartiallyImplicitIntEnum.B>(),
  expected: fc.constant(5),
})

define({
  actual: typeToArbitrary<false | true>(),
  expected: fc.boolean(),
})

define({
  actual: typeToArbitrary<true | false>(),
  expected: fc.boolean(),
})

define({
  actual: typeToArbitrary<1 | 3 | 2 | 4>(),
  expected: fc.constantFrom(1, 2, 3, 4),
})

define({
  actual: typeToArbitrary<1n | 3n | 2n | 4n>(),
  expected: fc.constantFrom(1n, 2n, 3n, 4n),
})

define({
  actual: typeToArbitrary<'b' | 'a' | 'd' | 'c'>(),
  expected: fc.constantFrom(`a`, `b`, `c`, `d`),
})

define({
  actual: typeToArbitrary<string | undefined>(),
  expected: fc.option(fc.string(), { nil: undefined }),
})

define({
  actual: typeToArbitrary<string | null>(),
  expected: fc.option(fc.string()),
})

define({
  actual: typeToArbitrary<string | undefined | null>(),
  expected: fc.oneof(fc.string(), fc.constantFrom(null, undefined)),
})

define({
  actual: typeToArbitrary<string | number>(),
  expected: fc.oneof(fc.string(), fc.double()),
})

define({ actual: typeToArbitrary<string | never>(), expected: fc.string() })

define({
  actual: (<T>() => typeToArbitrary<T>())(),
  expected: fc.anything(),
})

define({
  actual: (<T extends string>() => typeToArbitrary<T>())(),
  expected: fc.string(),
})

define({ actual: typeToArbitrary<unknown>(), expected: fc.anything() })

define({ actual: typeToArbitrary<any>(), expected: fc.anything() })

export default testCases
