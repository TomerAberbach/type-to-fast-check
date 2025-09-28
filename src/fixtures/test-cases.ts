/* eslint-disable typescript/no-unsafe-function-type */
/* eslint-disable typescript/array-type */
/* eslint-disable typescript/no-unnecessary-template-expression */
/* eslint-disable typescript/no-invalid-void-type */
/* eslint-disable typescript/no-redundant-type-constituents */
/* eslint-disable stylistic/quotes */

import type * as fc from 'fast-check'

declare const typeToArbitrary: <T>() => fc.Arbitrary<T>

type TestCase<T = unknown> = {
  arb: fc.Arbitrary<T>
  typecheck?: boolean
}

const testCases: TestCase[] = []

const test = (testCase: {
  arb: fc.Arbitrary<unknown>
  typecheck?: boolean
}) => {
  testCases.push(testCase)
}

// Never
test({ arb: typeToArbitrary<never>(), typecheck: false })

// Undefined
test({ arb: typeToArbitrary<void>() })
test({ arb: typeToArbitrary<undefined>() })

// Boolean
test({ arb: typeToArbitrary<boolean>() })
test({ arb: typeToArbitrary<false>() })
test({ arb: typeToArbitrary<true>() })

// Number
test({ arb: typeToArbitrary<number>() })
test({ arb: typeToArbitrary<0>() })
test({ arb: typeToArbitrary<1>() })
test({ arb: typeToArbitrary<42>() })
test({ arb: typeToArbitrary<1.5>() })
test({ arb: typeToArbitrary<-3>() })
test({ arb: typeToArbitrary<-3.14>() })

// Bigint
test({ arb: typeToArbitrary<bigint>() })
test({ arb: typeToArbitrary<0n>() })
test({ arb: typeToArbitrary<1n>() })
test({ arb: typeToArbitrary<42n>() })
test({ arb: typeToArbitrary<-3n>() })

// String
test({ arb: typeToArbitrary<string>() })
test({ arb: typeToArbitrary<'Hello World!'>() })
test({ arb: typeToArbitrary<`Hello World!`>() })
test({ arb: typeToArbitrary<`Hello ${undefined}!`>() })
test({ arb: typeToArbitrary<`Hello ${null}!`>() })
test({ arb: typeToArbitrary<`Hello ${boolean}!`>() })
test({ arb: typeToArbitrary<`Hello ${false}!`>() })
test({ arb: typeToArbitrary<`Hello ${true}!`>() })
test({ arb: typeToArbitrary<`Hello ${true}!`>() })
test({ arb: typeToArbitrary<`Hello ${number}!`>() })
test({ arb: typeToArbitrary<`Hello ${42}!`>() })
test({ arb: typeToArbitrary<`Hello ${bigint}!`>() })
test({ arb: typeToArbitrary<`Hello ${42n}!`>() })
test({ arb: typeToArbitrary<`${string}`>() })
test({ arb: typeToArbitrary<`Hello ${string}!`>() })
test({ arb: typeToArbitrary<`${string} - ${number} - ${string}`>() })

// Symbol
test({ arb: typeToArbitrary<symbol>() })
const _symbol: unique symbol = Symbol('unique')
test({ arb: typeToArbitrary<typeof _symbol>(), typecheck: false })

// Array
test({ arb: typeToArbitrary<string[]>() })
test({ arb: typeToArbitrary<Array<string>>() })
test({ arb: typeToArbitrary<readonly string[]>() })
test({ arb: typeToArbitrary<ReadonlyArray<string>>() })

// Tuple
test({ arb: typeToArbitrary<[string, number]>() })

// Object
test({ arb: typeToArbitrary<{ a: string; b: number }>() })
test({ arb: typeToArbitrary<{ a: string; b: number | undefined }>() })
test({ arb: typeToArbitrary<{ a: string; b?: number }>() })
test({ arb: typeToArbitrary<object>() })

// Function
test({ arb: typeToArbitrary<() => string>() })
test({ arb: typeToArbitrary<Function>(), typecheck: false })

// Enum
enum StringEnum {
  B = 'b',
  A = 'a',
  C = 'c',
}
test({
  arb: typeToArbitrary<StringEnum>(),
  // TODO(#17): Remove this once enums are referenced at runtime.
  typecheck: false,
})
test({
  arb: typeToArbitrary<StringEnum.C>(),
  // TODO(#17): Remove this once enums are referenced at runtime.
  typecheck: false,
})
enum IntEnum {
  B = 1,
  A = 0,
  C = 2,
}
test({ arb: typeToArbitrary<IntEnum>() })
test({ arb: typeToArbitrary<IntEnum.C>() })
enum ImplicitIntEnum {
  A,
  B,
  C,
}
test({ arb: typeToArbitrary<ImplicitIntEnum>() })
test({ arb: typeToArbitrary<ImplicitIntEnum.B>() })
enum PartiallyImplicitIntEnum {
  A = 4,
  B,
  C = 2,
  D,
}
test({ arb: typeToArbitrary<PartiallyImplicitIntEnum>() })
test({ arb: typeToArbitrary<PartiallyImplicitIntEnum.B>() })

// Union
test({ arb: typeToArbitrary<false | true>() })
test({ arb: typeToArbitrary<true | false>() })
test({ arb: typeToArbitrary<1 | 3 | 2 | 4>() })
test({ arb: typeToArbitrary<1n | 3n | 2n | 4n>() })
test({ arb: typeToArbitrary<'b' | 'a' | 'd' | 'c'>() })
test({ arb: typeToArbitrary<string | undefined>() })
test({ arb: typeToArbitrary<string | null>() })
test({ arb: typeToArbitrary<string | undefined | null>() })
test({ arb: typeToArbitrary<string | number>() })
test({ arb: typeToArbitrary<string | never>() })

// Type parameter
test({
  arb: (<T>() => typeToArbitrary<T>())(),
  typecheck: false,
})
test({
  arb: (<T extends string>() => typeToArbitrary<T>())(),
  typecheck: false,
})

// Unknown
test({ arb: typeToArbitrary<unknown>() })
test({ arb: typeToArbitrary<any>() })

export default testCases
