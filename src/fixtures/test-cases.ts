/* eslint-disable typescript/no-redundant-type-constituents */
/* eslint-disable stylistic/quotes */

import * as fc from 'fast-check'

declare const typeToArbitrary: <T>() => fc.Arbitrary<T>

/** For type-safety between actual and expected arbitrary types. */
const define = <T>(testCase: {
  actual: fc.Arbitrary<T>
  expected: fc.Arbitrary<T>
  stringify?: boolean
}) => testCase

const neverArb = fc.constant(`never`).map(message => {
  throw new Error(message)
})

export const never = define({
  actual: typeToArbitrary<never>(),
  expected: neverArb,
})

const voidType = define({
  // eslint-disable-next-line typescript/no-invalid-void-type
  actual: typeToArbitrary<void>(),
  expected: fc.constant(undefined),
})
export { voidType as void }

const undefinedType = define({
  actual: typeToArbitrary<undefined>(),
  expected: fc.constant(undefined),
})
export { undefinedType as undefined }

export const boolean = define({
  actual: typeToArbitrary<boolean>(),
  expected: fc.boolean(),
})

export const falseLiteral = define({
  actual: typeToArbitrary<false>(),
  expected: fc.constant(false),
})

export const trueLiteral = define({
  actual: typeToArbitrary<true>(),
  expected: fc.constant(true),
})

export const number = define({
  actual: typeToArbitrary<number>(),
  expected: fc.double(),
})

export const integerLiteral = define({
  actual: typeToArbitrary<1>(),
  expected: fc.constant(1),
})

export const doubleLiteral = define({
  actual: typeToArbitrary<1.5>(),
  expected: fc.constant(1.5),
})

export const bigint = define({
  actual: typeToArbitrary<bigint>(),
  expected: fc.bigInt(),
})

export const bigintLiteral = define({
  actual: typeToArbitrary<1n>(),
  expected: fc.constant(1n),
})

export const string = define({
  actual: typeToArbitrary<string>(),
  expected: fc.string(),
})

export const stringLiteral = define({
  actual: typeToArbitrary<'Hello World!'>(),
  expected: fc.constant(`Hello World!`),
})

export const symbol = define({
  actual: typeToArbitrary<symbol>(),
  expected: fc.string().map(Symbol),
  stringify: true,
})

const _symbol: unique symbol = Symbol('unique')

export const uniqueSymbol = define({
  actual: typeToArbitrary<typeof _symbol>(),
  expected: fc.string().map(Symbol),
  stringify: true,
})

export const array = define({
  actual: typeToArbitrary<string[]>(),
  expected: fc.array(fc.string()),
})

export const arrayInterface = define({
  // eslint-disable-next-line typescript/array-type
  actual: typeToArbitrary<Array<string>>(),
  expected: fc.array(fc.string()),
})

export const readonlyArray = define({
  actual: typeToArbitrary<readonly string[]>(),
  expected: fc.array(fc.string()),
})

export const readonlyArrayInterface = define({
  // eslint-disable-next-line typescript/array-type
  actual: typeToArbitrary<ReadonlyArray<string>>(),
  expected: fc.array(fc.string()),
})

export const tuple = define({
  actual: typeToArbitrary<[string, number]>(),
  expected: fc.tuple(fc.string(), fc.double()),
})

export const objectLiteral = define({
  actual: typeToArbitrary<{ a: string; b: number }>(),
  expected: fc.record({ a: fc.string(), b: fc.double() }),
})

export const objectLiteralWithUndefinedProperty = define({
  actual: typeToArbitrary<{ a: string; b: number | undefined }>(),
  expected: fc.record({
    a: fc.string(),
    b: fc.option(fc.double(), { nil: undefined }),
  }),
})

export const objectLiteralWithOptionalProperty = define({
  actual: typeToArbitrary<{ a: string; b?: number }>(),
  expected: fc.record(
    { a: fc.string(), b: fc.option(fc.double(), { nil: undefined }) },
    { requiredKeys: [`a`] },
  ),
})

export const object = define({
  actual: typeToArbitrary<object>(),
  expected: fc.object(),
})

enum StringEnum {
  B = 'b',
  A = 'a',
  C = 'c',
}

export const stringEnum = define({
  actual: typeToArbitrary<StringEnum>(),
  expected: fc.constantFrom(`a`, `b`, `c`),
})

export const stringEnumLiteral = define({
  actual: typeToArbitrary<StringEnum.C>(),
  expected: fc.constant(`c`),
})

enum IntEnum {
  B = 1,
  A = 0,
  C = 2,
}

export const intEnum = define({
  actual: typeToArbitrary<IntEnum>(),
  expected: fc.constantFrom(0, 1, 2),
})

export const intEnumLiteral = define({
  actual: typeToArbitrary<IntEnum.C>(),
  expected: fc.constant(2),
})

enum ImplicitIntEnum {
  A,
  B,
  C,
}

export const implicitIntEnum = define({
  actual: typeToArbitrary<ImplicitIntEnum>(),
  expected: fc.constantFrom(0, 1, 2),
})

export const implicitIntEnumLiteral = define({
  actual: typeToArbitrary<ImplicitIntEnum.B>(),
  expected: fc.constant(1),
})

enum PartiallyImplicitIntEnum {
  A = 4,
  B,
  C = 2,
  D,
}

export const partiallyImplicitIntEnum = define({
  actual: typeToArbitrary<PartiallyImplicitIntEnum>(),
  expected: fc.constantFrom(2, 3, 4, 5),
})

export const partiallyImplicitIntEnumLiteral = define({
  actual: typeToArbitrary<PartiallyImplicitIntEnum.B>(),
  expected: fc.constant(5),
})

export const falseOrTrue = define({
  actual: typeToArbitrary<false | true>(),
  expected: fc.boolean(),
})

export const trueOrFalse = define({
  actual: typeToArbitrary<true | false>(),
  expected: fc.boolean(),
})

export const numberUnion = define({
  actual: typeToArbitrary<1 | 3 | 2 | 4>(),
  expected: fc.constantFrom(1, 2, 3, 4),
})

export const bigintUnion = define({
  actual: typeToArbitrary<1n | 3n | 2n | 4n>(),
  expected: fc.constantFrom(1n, 2n, 3n, 4n),
})

export const stringUnion = define({
  actual: typeToArbitrary<'b' | 'a' | 'd' | 'c'>(),
  expected: fc.constantFrom(`a`, `b`, `c`, `d`),
})

export const stringOrUndefined = define({
  actual: typeToArbitrary<string | undefined>(),
  expected: fc.option(fc.string(), { nil: undefined }),
})

export const stringOrNull = define({
  actual: typeToArbitrary<string | null>(),
  expected: fc.option(fc.string()),
})

export const stringOrUndefinedOrNull = define({
  actual: typeToArbitrary<string | undefined | null>(),
  expected: fc.oneof(fc.string(), fc.constantFrom(null, undefined)),
})

export const stringOrNumber = define({
  actual: typeToArbitrary<string | number>(),
  expected: fc.oneof(fc.string(), fc.double()),
})

export const stringOrNever = define({
  actual: typeToArbitrary<string | never>(),
  expected: fc.string(),
})

export const unconstrainedTypeParam = define({
  actual: (<T>() => typeToArbitrary<T>())(),
  expected: fc.anything(),
})

export const constrainedTypeParam = define({
  actual: (<T extends string>() => typeToArbitrary<T>())(),
  expected: fc.string(),
})

export const unknown = define({
  actual: typeToArbitrary<unknown>(),
  expected: fc.anything(),
})

export const any = define({
  actual: typeToArbitrary<any>(),
  expected: fc.anything(),
})
