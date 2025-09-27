import * as ttfc from "fast-check";
/* eslint-disable typescript/no-unsafe-function-type */
/* eslint-disable typescript/array-type */
/* eslint-disable typescript/no-unnecessary-template-expression */
/* eslint-disable typescript/no-invalid-void-type */
/* eslint-disable typescript/no-redundant-type-constituents */
/* eslint-disable stylistic/quotes */
import * as fc from 'fast-check';
declare const typeToArbitrary: <T>() => fc.Arbitrary<T>;
type TestCase<T = unknown> = {
    actual: fc.Arbitrary<T>;
    expected: fc.Arbitrary<T>;
    roundtrippable?: boolean;
};
const testCases: TestCase[] = [];
/** For type-safety between actual and expected arbitrary types. */
const define = <T>(testCase: {
    actual: fc.Arbitrary<T>;
    expected: fc.Arbitrary<T>;
    roundtrippable?: boolean;
}) => {
    testCases.push(testCase);
};
const neverArb = fc.constant(`never`).map(message => {
    throw new Error(message);
});
// Never
define({
    actual: ttfc.constant("never").map(value => { throw new globalThis.Error(value); }),
    expected: neverArb,
    roundtrippable: false,
});
// Undefined
define({ actual: ttfc.constant(undefined), expected: fc.constant(undefined) });
define({
    actual: ttfc.constant(undefined),
    expected: fc.constant(undefined),
});
// Boolean
define({ actual: ttfc.boolean(), expected: fc.boolean() });
define({ actual: ttfc.constant(false), expected: fc.constant(false) });
define({ actual: ttfc.constant(true), expected: fc.constant(true) });
// Number
define({ actual: ttfc.double(), expected: fc.double() });
define({ actual: ttfc.constant(0), expected: fc.constant(0) });
define({ actual: ttfc.constant(1), expected: fc.constant(1) });
define({ actual: ttfc.constant(42), expected: fc.constant(42) });
define({ actual: ttfc.constant(1.5), expected: fc.constant(1.5) });
define({ actual: ttfc.constant(-3), expected: fc.constant(-3) });
define({ actual: ttfc.constant(-3.14), expected: fc.constant(-3.14) });
// Bigint
define({ actual: ttfc.bigInt(), expected: fc.bigInt() });
define({ actual: ttfc.constant(0n), expected: fc.constant(0n) });
define({ actual: ttfc.constant(1n), expected: fc.constant(1n) });
define({ actual: ttfc.constant(42n), expected: fc.constant(42n) });
define({ actual: ttfc.constant(-3n), expected: fc.constant(-3n) });
// String
define({ actual: ttfc.string(), expected: fc.string() });
define({
    actual: ttfc.constant("Hello World!"),
    expected: fc.constant(`Hello World!`),
});
define({
    actual: ttfc.constant("Hello World!"),
    expected: fc.constant(`Hello World!`),
});
define({
    actual: ttfc.constant("Hello undefined!"),
    expected: fc.constant(`Hello undefined!`),
});
define({
    actual: ttfc.constant("Hello null!"),
    expected: fc.constant(`Hello null!`),
});
define({
    actual: ttfc.constantFrom("Hello false!", "Hello true!"),
    expected: fc.constantFrom(`Hello false!`, `Hello true!`),
});
define({
    actual: ttfc.constant("Hello false!"),
    expected: fc.constant(`Hello false!`),
});
define({
    actual: ttfc.constant("Hello true!"),
    expected: fc.constant(`Hello true!`),
});
define({
    actual: ttfc.constant("Hello true!"),
    expected: fc.constant(`Hello true!`),
});
define({
    actual: ttfc.double().map(value => `Hello ${value}!`),
    expected: fc.double().map(number => `Hello ${number}!`),
});
define({
    actual: ttfc.constant("Hello 42!"),
    expected: fc.constant(`Hello 42!`),
});
define({
    actual: ttfc.bigInt().map(value => `Hello ${value}!`),
    expected: fc.bigInt().map(bigInt => `Hello ${bigInt}!`),
});
define({
    actual: ttfc.constant("Hello 42!"),
    expected: fc.constant(`Hello 42!`),
});
define({
    actual: ttfc.string(),
    expected: fc.string(),
});
define({
    actual: ttfc.string().map(value => `Hello ${value}!`),
    expected: fc.string().map(string => `Hello ${string}!`),
});
define({
    actual: ttfc.tuple(ttfc.string(), ttfc.double(), ttfc.string()).map(value => `${value[0]} ${value[1]} ${value[2]}`),
    expected: fc
        .tuple(fc.string(), fc.double(), fc.string())
        .map(value => `${value[0]} ${value[1]} ${value[2]}`),
});
// Symbol
define({
    actual: ttfc.string().map(value => globalThis.Symbol(value)),
    expected: fc.string().map(Symbol),
    roundtrippable: false,
});
const _symbol: unique symbol = Symbol('unique');
define({
    actual: ttfc.string().map(value => globalThis.Symbol(value)),
    expected: fc.string().map(Symbol),
    roundtrippable: false,
});
// Array
define({
    actual: ttfc.array(ttfc.string()),
    expected: fc.array(fc.string()),
});
define({
    actual: ttfc.array(ttfc.string()),
    expected: fc.array(fc.string()),
});
define({
    actual: ttfc.array(ttfc.string()),
    expected: fc.array(fc.string()),
});
define({
    actual: ttfc.array(ttfc.string()),
    expected: fc.array(fc.string()),
});
// Tuple
define({
    actual: ttfc.tuple(ttfc.string(), ttfc.double()),
    expected: fc.tuple(fc.string(), fc.double()),
});
// Object
define({
    actual: ttfc.record({ ["a"]: ttfc.string(), ["b"]: ttfc.double() }),
    expected: fc.record({ a: fc.string(), b: fc.double() }),
});
define({
    actual: ttfc.record({ ["a"]: ttfc.string(), ["b"]: ttfc.option(ttfc.double(), { nil: undefined }) }),
    expected: fc.record({
        a: fc.string(),
        b: fc.option(fc.double(), { nil: undefined }),
    }),
});
define({
    actual: ttfc.record({ ["a"]: ttfc.string(), ["b"]: ttfc.option(ttfc.double(), { nil: undefined }) }, { requiredKeys: ["a"] }),
    expected: fc.record({ a: fc.string(), b: fc.option(fc.double(), { nil: undefined }) }, { requiredKeys: [`a`] }),
});
define({
    actual: ttfc.object(),
    expected: fc.object(),
});
// Function
define({
    actual: ttfc.func(ttfc.string()),
    expected: fc.func(fc.string()),
    roundtrippable: false,
});
define({
    actual: ttfc.func(ttfc.anything()),
    expected: fc.func(fc.anything()),
    roundtrippable: false,
});
// Enum
enum StringEnum {
    B = 'b',
    A = 'a',
    C = 'c'
}
define({
    actual: ttfc.constantFrom("a", "b", "c"),
    expected: fc.constantFrom(StringEnum.A, StringEnum.B, StringEnum.C),
    // TODO(#17): Remove this once enums are referenced at runtime.
    roundtrippable: false,
});
define({
    actual: ttfc.constant("c"),
    expected: fc.constant(StringEnum.C),
    // TODO(#17): Remove this once enums are referenced at runtime.
    roundtrippable: false,
});
enum IntEnum {
    B = 1,
    A = 0,
    C = 2
}
define({
    actual: ttfc.constantFrom(0, 1, 2),
    expected: fc.constantFrom(0, 1, 2),
});
define({
    actual: ttfc.constant(2),
    expected: fc.constant(2),
});
enum ImplicitIntEnum {
    A,
    B,
    C
}
define({
    actual: ttfc.constantFrom(0, 1, 2),
    expected: fc.constantFrom(0, 1, 2),
});
define({
    actual: ttfc.constant(1),
    expected: fc.constant(1),
});
enum PartiallyImplicitIntEnum {
    A = 4,
    B,
    C = 2,
    D
}
define({
    actual: ttfc.constantFrom(2, 3, 4, 5),
    expected: fc.constantFrom(2, 3, 4, 5),
});
define({
    actual: ttfc.constant(5),
    expected: fc.constant(5),
});
// Union
define({
    actual: ttfc.boolean(),
    expected: fc.boolean(),
});
define({
    actual: ttfc.boolean(),
    expected: fc.boolean(),
});
define({
    actual: ttfc.constantFrom(1, 2, 3, 4),
    expected: fc.constantFrom(1, 2, 3, 4),
});
define({
    actual: ttfc.constantFrom(1n, 2n, 3n, 4n),
    expected: fc.constantFrom(1n, 2n, 3n, 4n),
});
define({
    actual: ttfc.constantFrom("a", "b", "c", "d"),
    expected: fc.constantFrom(`a`, `b`, `c`, `d`),
});
define({
    actual: ttfc.option(ttfc.string(), { nil: undefined }),
    expected: fc.option(fc.string(), { nil: undefined }),
});
define({
    actual: ttfc.option(ttfc.string()),
    expected: fc.option(fc.string()),
});
define({
    actual: ttfc.oneof(ttfc.string(), ttfc.constantFrom(null, undefined)),
    expected: fc.oneof(fc.string(), fc.constantFrom(null, undefined)),
});
define({
    actual: ttfc.oneof(ttfc.string(), ttfc.double()),
    expected: fc.oneof(fc.string(), fc.double()),
});
define({ actual: ttfc.string(), expected: fc.string() });
// Type parameter
define({
    actual: (<T>() => ttfc.anything())(),
    expected: fc.anything(),
    roundtrippable: false,
});
define({
    actual: (<T extends string>() => ttfc.string())(),
    expected: fc.string(),
    roundtrippable: false,
});
// Unknown
define({ actual: ttfc.anything(), expected: fc.anything() });
define({ actual: ttfc.anything(), expected: fc.anything() });
export default testCases;
