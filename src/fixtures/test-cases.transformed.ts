import * as ttfc from "fast-check";
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
import type * as fc from 'fast-check';
declare const typeToArb: <T>() => fc.Arbitrary<T>;
type TestCase<T = unknown> = {
    arb: fc.Arbitrary<T>;
    typecheck?: boolean;
};
const testCases: TestCase[] = [];
const test = (testCase: {
    arb: fc.Arbitrary<unknown>;
    typecheck?: boolean;
}) => {
    testCases.push(testCase);
};
// Never
test({ arb: /* never */ ttfc.constant("never").map(value => { throw new globalThis.Error(value); }), typecheck: false });
// Undefined
test({ arb: /* void */ ttfc.constant(undefined) });
test({ arb: /* undefined */ ttfc.constant(undefined) });
// Boolean
test({ arb: /* boolean */ ttfc.boolean() });
test({ arb: /* false */ ttfc.constant(false) });
test({ arb: /* true */ ttfc.constant(true) });
// Number
test({ arb: /* number */ ttfc.double() });
test({ arb: /* 0 */ ttfc.constant(0) });
test({ arb: /* 1 */ ttfc.constant(1) });
test({ arb: /* 42 */ ttfc.constant(42) });
test({ arb: /* 1.5 */ ttfc.constant(1.5) });
test({ arb: /* -3 */ ttfc.constant(-3) });
test({ arb: /* -3.14 */ ttfc.constant(-3.14) });
// Bigint
test({ arb: /* bigint */ ttfc.bigInt() });
test({ arb: /* 0n */ ttfc.constant(0n) });
test({ arb: /* 1n */ ttfc.constant(1n) });
test({ arb: /* 42n */ ttfc.constant(42n) });
test({ arb: /* -3n */ ttfc.constant(-3n) });
// String
test({ arb: /* string */ ttfc.string() });
test({ arb: /* "Hello World!" */ ttfc.constant("Hello World!") });
test({ arb: /* "Hello World!" */ ttfc.constant("Hello World!") });
test({ arb: /* "Hello undefined!" */ ttfc.constant("Hello undefined!") });
test({ arb: /* "Hello null!" */ ttfc.constant("Hello null!") });
test({ arb: /* "Hello false!" | "Hello true!" */ ttfc.constantFrom("Hello false!", "Hello true!") });
test({ arb: /* "Hello false!" */ ttfc.constant("Hello false!") });
test({ arb: /* "Hello true!" */ ttfc.constant("Hello true!") });
test({ arb: /* "Hello true!" */ ttfc.constant("Hello true!") });
test({ arb: /* `Hello ${number}!` */ ttfc.double({ noDefaultInfinity: true, noNaN: true }).map(value => `Hello ${value}!`) });
test({ arb: /* "Hello 42!" */ ttfc.constant("Hello 42!") });
test({ arb: /* `Hello ${bigint}!` */ ttfc.bigInt().map(value => `Hello ${value}!`) });
test({ arb: /* "Hello 42!" */ ttfc.constant("Hello 42!") });
test({ arb: /* string */ ttfc.string() });
test({ arb: /* `Hello ${string}!` */ ttfc.string().map(value => `Hello ${value}!`) });
test({ arb: /* `${string} - ${number} - ${string}` */ ttfc.tuple(ttfc.string(), ttfc.double({ noDefaultInfinity: true, noNaN: true }), ttfc.string()).map(value => `${value[0]} - ${value[1]} - ${value[2]}`) });
test({ arb: /* "HI" */ ttfc.constant("HI") });
test({ arb: /* Uppercase<string> */ ttfc.string().map(value => value.toUpperCase()) });
test({ arb: /* "hi" */ ttfc.constant("hi") });
test({ arb: /* Lowercase<string> */ ttfc.string().map(value => value.toLowerCase()) });
test({ arb: /* "Hi" */ ttfc.constant("Hi") });
test({ arb: /* Capitalize<string> */ ttfc.string().map(value => value.charAt(0).toUpperCase() + value.slice(1)) });
test({ arb: /* "hi" */ ttfc.constant("hi") });
test({ arb: /* Uncapitalize<string> */ ttfc.string().map(value => value.charAt(0).toLowerCase() + value.slice(1)) });
// Symbol
test({ arb: /* symbol */ ttfc.string().map(value => globalThis.Symbol(value)) });
const _symbol: unique symbol = Symbol('unique');
test({ arb: /* unique symbol */ ttfc.string().map(value => globalThis.Symbol(value)), typecheck: false });
// Array
test({ arb: /* string[] */ ttfc.array(ttfc.string()) });
test({ arb: /* string[] */ ttfc.array(ttfc.string()) });
test({ arb: /* readonly string[] */ ttfc.array(ttfc.string()) });
test({ arb: /* readonly string[] */ ttfc.array(ttfc.string()) });
// Tuple
test({ arb: /* [string, number] */ ttfc.tuple(ttfc.string(), ttfc.double()) });
test({ arb: /* [string, number, boolean] */ ttfc.tuple(ttfc.string(), ttfc.double(), ttfc.boolean()) });
test({ arb: /* [string, number, (boolean | undefined)?] */ ttfc.oneof(ttfc.tuple(ttfc.string(), ttfc.double()), ttfc.tuple(ttfc.string(), ttfc.double(), ttfc.option(ttfc.boolean(), { nil: undefined }))) });
test({ arb: /* [string, (number | undefined)?, (boolean | undefined)?] */ ttfc.oneof(ttfc.tuple(ttfc.string()), ttfc.tuple(ttfc.string(), ttfc.option(ttfc.double(), { nil: undefined })), ttfc.tuple(ttfc.string(), ttfc.option(ttfc.double(), { nil: undefined }), ttfc.option(ttfc.boolean(), { nil: undefined }))) });
test({ arb: /* [(string | undefined)?, (number | undefined)?, (boolean | undefined)?] */ ttfc.oneof(ttfc.tuple(), ttfc.tuple(ttfc.option(ttfc.string(), { nil: undefined })), ttfc.tuple(ttfc.option(ttfc.string(), { nil: undefined }), ttfc.option(ttfc.double(), { nil: undefined })), ttfc.tuple(ttfc.option(ttfc.string(), { nil: undefined }), ttfc.option(ttfc.double(), { nil: undefined }), ttfc.option(ttfc.boolean(), { nil: undefined }))) });
test({ arb: /* [string, number, ...boolean[]] */ ttfc.tuple(ttfc.string(), ttfc.double(), ttfc.array(ttfc.boolean())).map(value => [value[0], value[1], ...value[2]]) });
test({ arb: /* [string, ...number[], boolean] */ ttfc.tuple(ttfc.string(), ttfc.array(ttfc.double()), ttfc.boolean()).map(value => [value[0], ...value[1], value[2]]) });
test({ arb: /* [...string[], number, boolean] */ ttfc.tuple(ttfc.array(ttfc.string()), ttfc.double(), ttfc.boolean()).map(value => [...value[0], value[1], value[2]]) });
test({ arb: /* [string[], number[], boolean[]] */ ttfc.tuple(ttfc.array(ttfc.string()), ttfc.array(ttfc.double()), ttfc.array(ttfc.boolean())) });
test({ arb: /* readonly [string, number] */ ttfc.tuple(ttfc.string(), ttfc.double()) });
test({ arb: /* readonly [string, number, boolean] */ ttfc.tuple(ttfc.string(), ttfc.double(), ttfc.boolean()) });
test({ arb: /* readonly [string, number, ...boolean[]] */ ttfc.tuple(ttfc.string(), ttfc.double(), ttfc.array(ttfc.boolean())).map(value => [value[0], value[1], ...value[2]]) });
test({ arb: /* readonly [string, ...number[], boolean] */ ttfc.tuple(ttfc.string(), ttfc.array(ttfc.double()), ttfc.boolean()).map(value => [value[0], ...value[1], value[2]]) });
test({ arb: /* readonly [...string[], number, boolean] */ ttfc.tuple(ttfc.array(ttfc.string()), ttfc.double(), ttfc.boolean()).map(value => [...value[0], value[1], value[2]]) });
test({ arb: /* readonly [string[], number[], boolean[]] */ ttfc.tuple(ttfc.array(ttfc.string()), ttfc.array(ttfc.double()), ttfc.array(ttfc.boolean())) });
// Object
test({ arb: /* { a: string; b: number; } */ ttfc.record({ a: ttfc.string(), b: ttfc.double() }) });
test({ arb: /* { a: string; b: number | undefined; } */ ttfc.record({ a: ttfc.string(), b: ttfc.option(ttfc.double(), { nil: undefined }) }) });
test({ arb: /* { a: string; b?: number | undefined; } */ ttfc.record({ a: ttfc.string(), b: ttfc.option(ttfc.double(), { nil: undefined }) }, { requiredKeys: ["a"] }) });
test({ arb: /* Partial<{ a: string; b?: number | undefined; }> */ ttfc.record({ a: ttfc.option(ttfc.string(), { nil: undefined }), b: ttfc.option(ttfc.double(), { nil: undefined }) }) });
test({ arb: /* Required<{ a: string; b?: number | undefined; }> */ ttfc.record({ a: ttfc.string(), b: ttfc.double() }) });
test({ arb: /* Readonly<{ a: string; b?: number | undefined; }> */ ttfc.record({ a: ttfc.string(), b: ttfc.option(ttfc.double(), { nil: undefined }) }, { requiredKeys: ["a"] }) });
test({ arb: /* Pick<{ a: string; b?: number | undefined; c: boolean; }, "a"> */ ttfc.record({ a: ttfc.string() }) });
test({
    arb: /* Pick<{ a: string; b?: number | undefined; c: boolean; }, "a" | "c"> */ ttfc.record({ a: ttfc.string(), c: ttfc.boolean() }),
});
test({ arb: /* Omit<{ a: string; b?: number | undefined; c: boolean; }, "a"> */ ttfc.record({ b: ttfc.option(ttfc.double(), { nil: undefined }), c: ttfc.boolean() }, { requiredKeys: ["c"] }) });
test({
    arb: /* Omit<{ a: string; b?: number | undefined; c: boolean; }, "a" | "c"> */ ttfc.record({ b: ttfc.option(ttfc.double(), { nil: undefined }) }),
});
test({ arb: /* object */ ttfc.object() });
// Interface
interface Interface {
    a: string;
    b: number;
}
test({ arb: /* Interface */ ttfc.record({ a: ttfc.string(), b: ttfc.double() }) });
interface InterfaceWithUndefined {
    a: string;
    b: number | undefined;
}
test({ arb: /* InterfaceWithUndefined */ ttfc.record({ a: ttfc.string(), b: ttfc.option(ttfc.double(), { nil: undefined }) }) });
interface InterfaceWithOptional {
    a: string;
    b?: number;
}
test({ arb: /* InterfaceWithOptional */ ttfc.record({ a: ttfc.string(), b: ttfc.option(ttfc.double(), { nil: undefined }) }, { requiredKeys: ["a"] }) });
interface InterfaceWithExtends extends Interface {
    c: string;
}
test({ arb: /* InterfaceWithExtends */ ttfc.record({ c: ttfc.string(), a: ttfc.string(), b: ttfc.double() }) });
interface InterfaceWithFunctions {
    a(): number;
    b(): string;
    c: () => boolean;
}
test({ arb: /* InterfaceWithFunctions */ ttfc.record({ a: ttfc.func(ttfc.double()), b: ttfc.func(ttfc.string()), c: ttfc.func(ttfc.boolean()) }) });
// Class
class _C {
    public readonly _x: string;
    public readonly _y: number;
    public constructor(a: string, b: number) {
        this._x = a;
        this._y = b;
    }
}
test({ arb: /* [a: string, b: number] */ ttfc.tuple(ttfc.string(), ttfc.double()) });
// Dictionary
test({ arb: /* Record<string, number> */ ttfc.dictionary(ttfc.string(), ttfc.double()) });
test({ arb: /* { [key: string]: number; } */ ttfc.dictionary(ttfc.string(), ttfc.double()) });
test({ arb: /* { [key: string]: number; a: number; } */ ttfc.tuple(ttfc.dictionary(ttfc.string(), ttfc.double()), ttfc.record({ a: ttfc.double() })).map(value => globalThis.Object.assign(...value)) });
test({ arb: /* { [key: string]: string | number; a: string; } */ ttfc.tuple(ttfc.dictionary(ttfc.string(), ttfc.oneof(ttfc.string(), ttfc.double())), ttfc.record({ a: ttfc.string() })).map(value => globalThis.Object.assign(...value)) });
test({ arb: /* { [key: string]: boolean; [key: number]: boolean; } */ ttfc.dictionary(ttfc.oneof(ttfc.string(), ttfc.double()).map(value => globalThis.String(value)), ttfc.boolean()) });
// Function
test({ arb: /* () => string */ ttfc.func(ttfc.string()) });
test({ arb: /* Function */ ttfc.func(ttfc.anything()), typecheck: false });
test({ arb: /* () => string */ ttfc.func(ttfc.string()) });
test({ arb: /* { (): string; a: string; } */ ttfc.tuple(ttfc.func(ttfc.string()), ttfc.record({ a: ttfc.string() })).map(value => globalThis.Object.assign(...value)), typecheck: false });
test({
    arb: /* { (): string; a: string; b: number; } */ ttfc.tuple(ttfc.func(ttfc.string()), ttfc.record({ a: ttfc.string(), b: ttfc.double() })).map(value => globalThis.Object.assign(...value)),
    typecheck: false,
});
interface CallableInterface {
    a: string;
    b: () => number;
    (): string;
}
test({ arb: /* CallableInterface */ ttfc.tuple(ttfc.func(ttfc.string()), ttfc.record({ a: ttfc.string(), b: ttfc.func(ttfc.double()) })).map(value => globalThis.Object.assign(...value)), typecheck: false });
declare function _f(a: string, b: number): boolean;
test({ arb: /* (a: string, b: number) => boolean */ ttfc.func(ttfc.boolean()) });
test({ arb: /* [a: string, b: number] */ ttfc.tuple(ttfc.string(), ttfc.double()) });
test({ arb: /* boolean */ ttfc.boolean() });
declare function _g(this: {
    x: number;
}, a: string, b: number): boolean;
test({ arb: /* { x: number; } */ ttfc.record({ x: ttfc.double() }) });
test({ arb: /* (a: string, b: number) => boolean */ ttfc.func(ttfc.boolean()) });
// Enum
enum StringEnum {
    B = 'b',
    A = 'a',
    C = 'c'
}
test({
    arb: /* StringEnum */ ttfc.constantFrom("a", "b", "c"),
    // TODO(#17): Remove this once enums are referenced at runtime.
    typecheck: false,
});
test({
    arb: /* StringEnum.C */ ttfc.constant("c"),
    // TODO(#17): Remove this once enums are referenced at runtime.
    typecheck: false,
});
enum IntEnum {
    B = 1,
    A = 0,
    C = 2
}
test({ arb: /* IntEnum */ ttfc.constantFrom(0, 1, 2) });
test({ arb: /* IntEnum.C */ ttfc.constant(2) });
enum ImplicitIntEnum {
    A,
    B,
    C
}
test({ arb: /* ImplicitIntEnum */ ttfc.constantFrom(0, 1, 2) });
test({ arb: /* ImplicitIntEnum.B */ ttfc.constant(1) });
enum PartiallyImplicitIntEnum {
    A = 4,
    B,
    C = 2,
    D
}
test({ arb: /* PartiallyImplicitIntEnum */ ttfc.constantFrom(2, 3, 4, 5) });
test({ arb: /* PartiallyImplicitIntEnum.B */ ttfc.constant(5) });
// Union
test({ arb: /* boolean */ ttfc.boolean() });
test({ arb: /* boolean */ ttfc.boolean() });
test({ arb: /* 1 | 3 | 2 | 4 */ ttfc.constantFrom(1, 2, 3, 4) });
test({ arb: /* 1n | 3n | 2n | 4n */ ttfc.constantFrom(1n, 2n, 3n, 4n) });
test({ arb: /* "a" | "b" | "c" | "d" */ ttfc.constantFrom("a", "b", "c", "d") });
test({ arb: /* string | undefined */ ttfc.option(ttfc.string(), { nil: undefined }) });
test({ arb: /* string | null */ ttfc.option(ttfc.string()) });
test({ arb: /* string | null | undefined */ ttfc.oneof(ttfc.string(), ttfc.constantFrom(null, undefined)) });
test({ arb: /* string | number */ ttfc.oneof(ttfc.string(), ttfc.double()) });
test({ arb: /* string */ ttfc.string() });
test({ arb: /* undefined */ ttfc.constant(undefined) });
test({
    arb: /* { type: "a"; a: string; } */ ttfc.record({ type: ttfc.constant("a"), a: ttfc.string() }),
});
test({ arb: /* string */ ttfc.string() });
test({
    arb: /* { type: "b"; b: string; } */ ttfc.record({ type: ttfc.constant("b"), b: ttfc.string() }),
});
test({ arb: /* string */ ttfc.string() });
test({ arb: /* string */ ttfc.string() });
test({ arb: /* string */ ttfc.string() });
// Type parameter
test({
    arb: (<T>() => /* T */ ttfc.anything())(),
    typecheck: false,
});
test({
    arb: (<T extends string>() => /* T */ ttfc.string())(),
    typecheck: false,
});
// Unknown
test({ arb: /* unknown */ ttfc.anything() });
test({ arb: /* any */ ttfc.anything() });
// Operators
const _value = 'Hello World!';
test({ arb: /* string */ ttfc.string() });
test({ arb: /* keyof Interface */ ttfc.constantFrom("a", "b") });
test({ arb: /* "Hello World!" */ ttfc.constant("Hello World!") });
export default testCases;
