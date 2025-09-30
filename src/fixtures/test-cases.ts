/* eslint-disable typescript/consistent-indexed-object-style */
/* eslint-disable typescript/prefer-function-type */
/* eslint-disable typescript/method-signature-style */
/* eslint-disable typescript/consistent-type-definitions */
/* eslint-disable typescript/no-unsafe-function-type */
/* eslint-disable typescript/array-type */
/* eslint-disable typescript/no-unnecessary-template-expression */
/* eslint-disable typescript/no-invalid-void-type */
/* eslint-disable typescript/no-redundant-type-constituents */
/* eslint-disable stylistic/quotes */

import type * as fc from 'fast-check'

declare const typeToArb: <T>() => fc.Arbitrary<T>

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
test({ arb: typeToArb<never>(), typecheck: false })

// Undefined
test({ arb: typeToArb<void>() })
test({ arb: typeToArb<undefined>() })

// Boolean
test({ arb: typeToArb<boolean>() })
test({ arb: typeToArb<false>() })
test({ arb: typeToArb<true>() })

// Number
test({ arb: typeToArb<number>() })
test({ arb: typeToArb<0>() })
test({ arb: typeToArb<1>() })
test({ arb: typeToArb<42>() })
test({ arb: typeToArb<1.5>() })
test({ arb: typeToArb<-3>() })
test({ arb: typeToArb<-3.14>() })

// Bigint
test({ arb: typeToArb<bigint>() })
test({ arb: typeToArb<0n>() })
test({ arb: typeToArb<1n>() })
test({ arb: typeToArb<42n>() })
test({ arb: typeToArb<-3n>() })

// String
test({ arb: typeToArb<string>() })
test({ arb: typeToArb<'Hello World!'>() })
test({ arb: typeToArb<`Hello World!`>() })
test({ arb: typeToArb<`Hello ${undefined}!`>() })
test({ arb: typeToArb<`Hello ${null}!`>() })
test({ arb: typeToArb<`Hello ${boolean}!`>() })
test({ arb: typeToArb<`Hello ${false}!`>() })
test({ arb: typeToArb<`Hello ${true}!`>() })
test({ arb: typeToArb<`Hello ${true}!`>() })
test({ arb: typeToArb<`Hello ${number}!`>() })
test({ arb: typeToArb<`Hello ${42}!`>() })
test({ arb: typeToArb<`Hello ${bigint}!`>() })
test({ arb: typeToArb<`Hello ${42n}!`>() })
test({ arb: typeToArb<`${string}`>() })
test({ arb: typeToArb<`Hello ${string}!`>() })
test({ arb: typeToArb<`${string} - ${number} - ${string}`>() })

// Symbol
test({ arb: typeToArb<symbol>() })
const _symbol: unique symbol = Symbol('unique')
test({ arb: typeToArb<typeof _symbol>(), typecheck: false })

// Array
test({ arb: typeToArb<string[]>() })
test({ arb: typeToArb<Array<string>>() })
test({ arb: typeToArb<readonly string[]>() })
test({ arb: typeToArb<ReadonlyArray<string>>() })

// Tuple
test({ arb: typeToArb<[string, number]>() })

// Object
test({ arb: typeToArb<{ a: string; b: number }>() })
test({ arb: typeToArb<{ a: string; b: number | undefined }>() })
test({ arb: typeToArb<{ a: string; b?: number }>() })
test({ arb: typeToArb<object>() })

// Interface
interface Interface {
  a: string
  b: number
}
test({ arb: typeToArb<Interface>() })
interface InterfaceWithUndefined {
  a: string
  b: number | undefined
}
test({ arb: typeToArb<InterfaceWithUndefined>() })
interface InterfaceWithOptional {
  a: string
  b?: number
}
test({ arb: typeToArb<InterfaceWithOptional>() })
interface InterfaceWithExtends extends Interface {
  c: string
}
test({ arb: typeToArb<InterfaceWithExtends>() })
interface InterfaceWithFunctions {
  a(): number
  b(): string
  c: () => boolean
}
test({ arb: typeToArb<InterfaceWithFunctions>() })

// Dictionary
test({ arb: typeToArb<Record<string, number>>() })
test({ arb: typeToArb<{ [key: string]: number }>() })
test({ arb: typeToArb<{ a: number; [key: string]: number }>() })
test({ arb: typeToArb<{ a: string; [key: string]: number | string }>() })
test({ arb: typeToArb<{ [key: string | number]: boolean }>() })

// Function
test({ arb: typeToArb<() => string>() })
test({ arb: typeToArb<Function>(), typecheck: false })
test({ arb: typeToArb<{ (): string }>() })
test({ arb: typeToArb<{ a: string; (): string }>(), typecheck: false })
test({
  arb: typeToArb<{ a: string; (): string; b: number }>(),
  typecheck: false,
})
interface CallableInterface {
  a: string
  b: () => number
  (): string
}
test({ arb: typeToArb<CallableInterface>(), typecheck: false })

// Enum
enum StringEnum {
  B = 'b',
  A = 'a',
  C = 'c',
}
test({
  arb: typeToArb<StringEnum>(),
  // TODO(#17): Remove this once enums are referenced at runtime.
  typecheck: false,
})
test({
  arb: typeToArb<StringEnum.C>(),
  // TODO(#17): Remove this once enums are referenced at runtime.
  typecheck: false,
})
enum IntEnum {
  B = 1,
  A = 0,
  C = 2,
}
test({ arb: typeToArb<IntEnum>() })
test({ arb: typeToArb<IntEnum.C>() })
enum ImplicitIntEnum {
  A,
  B,
  C,
}
test({ arb: typeToArb<ImplicitIntEnum>() })
test({ arb: typeToArb<ImplicitIntEnum.B>() })
enum PartiallyImplicitIntEnum {
  A = 4,
  B,
  C = 2,
  D,
}
test({ arb: typeToArb<PartiallyImplicitIntEnum>() })
test({ arb: typeToArb<PartiallyImplicitIntEnum.B>() })

// Union
test({ arb: typeToArb<false | true>() })
test({ arb: typeToArb<true | false>() })
test({ arb: typeToArb<1 | 3 | 2 | 4>() })
test({ arb: typeToArb<1n | 3n | 2n | 4n>() })
test({ arb: typeToArb<'b' | 'a' | 'd' | 'c'>() })
test({ arb: typeToArb<string | undefined>() })
test({ arb: typeToArb<string | null>() })
test({ arb: typeToArb<string | undefined | null>() })
test({ arb: typeToArb<string | number>() })
test({ arb: typeToArb<string | never>() })

// Type parameter
test({
  arb: (<T>() => typeToArb<T>())(),
  typecheck: false,
})
test({
  arb: (<T extends string>() => typeToArb<T>())(),
  typecheck: false,
})

// Unknown
test({ arb: typeToArb<unknown>() })
test({ arb: typeToArb<any>() })

// Operators
const _value = 'Hello World!'
test({ arb: typeToArb<Interface[`a`]>() })
test({ arb: typeToArb<keyof Interface>() })
test({ arb: typeToArb<typeof _value>() })

export default testCases
