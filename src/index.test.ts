import { fc, test } from '@fast-check/vitest'
import ts from 'typescript'
import { expect } from 'vitest'
import { FAST_CHECK_IDENTIFIER_NAME } from './fast-check.ts'
import createTransformer from './transformer.ts'

test.each([
  {
    type: `any`,
    expectedArb: fc.anything(),
  },
  {
    type: `unknown`,
    expectedArb: fc.anything(),
  },
  {
    type: `void`,
    expectedArb: fc.constant(undefined),
  },
  {
    type: `undefined`,
    expectedArb: fc.constant(undefined),
  },
  {
    type: `boolean`,
    expectedArb: fc.boolean(),
  },
  {
    type: `false`,
    expectedArb: fc.constant(false),
  },
  {
    type: `true`,
    expectedArb: fc.constant(true),
  },
  {
    type: `number`,
    expectedArb: fc.double(),
  },
  {
    type: `1`,
    expectedArb: fc.constant(1),
  },
  {
    type: `1.5`,
    expectedArb: fc.constant(1.5),
  },
  {
    type: `bigint`,
    expectedArb: fc.bigInt(),
  },
  {
    type: `1n`,
    expectedArb: fc.constant(1n),
  },
  {
    type: `string`,
    expectedArb: fc.string(),
  },
  {
    type: `'Hello World!'`,
    expectedArb: fc.constant(`Hello World!`),
  },
  {
    type: `symbol`,
    expectedArb: fc.string().map(Symbol),
    stringify: true,
  },
  {
    type: `string[]`,
    expectedArb: fc.array(fc.string()),
  },
  {
    type: `Array<string>`,
    expectedArb: fc.array(fc.string()),
  },
  {
    type: `readonly string[]`,
    expectedArb: fc.array(fc.string()),
  },
  {
    type: `ReadonlyArray<string>`,
    expectedArb: fc.array(fc.string()),
  },
  {
    type: `{ a: string; b: number }`,
    expectedArb: fc.record({ a: fc.string(), b: fc.double() }),
  },
  {
    type: `{ a: string; b: number | undefined }`,
    expectedArb: fc.record({
      a: fc.string(),
      b: fc.option(fc.double(), { nil: undefined }),
    }),
  },
  {
    type: `{ a: string; b?: number }`,
    expectedArb: fc.record(
      { a: fc.string(), b: fc.option(fc.double(), { nil: undefined }) },
      { requiredKeys: [`a`] },
    ),
  },
  {
    type: `object`,
    expectedArb: fc.object(),
  },
  {
    setUp: `
      enum StringEnum {
        B = 'b',
        A = 'a',
        C = 'c',
      }
    `,
    type: `StringEnum`,
    expectedArb: fc.constantFrom(`a`, `b`, `c`),
  },
  {
    setUp: `
      enum IntEnum {
        B = 1,
        A = 0,
        C = 2,
      }
    `,
    type: `IntEnum`,
    expectedArb: fc.constantFrom(0, 1, 2),
  },
  {
    setUp: `
      enum ImplicitIntEnum {
        A,
        B,
        C,
      }
    `,
    type: `ImplicitIntEnum`,
    expectedArb: fc.constantFrom(0, 1, 2),
  },
  {
    setUp: `
      enum PartiallyImplicitIntEnum {
        A = 4,
        B,
        C = 2,
        D,
      }
    `,
    type: `PartiallyImplicitIntEnum`,
    expectedArb: fc.constantFrom(2, 3, 4, 5),
  },
  {
    type: `false | true`,
    expectedArb: fc.boolean(),
  },
  {
    type: `true | false`,
    expectedArb: fc.boolean(),
  },
  {
    type: `1 | 3 | 2 | 4`,
    expectedArb: fc.constantFrom(1, 2, 3, 4),
  },
  {
    type: `1n | 3n | 2n | 4n`,
    expectedArb: fc.constantFrom(1n, 2n, 3n, 4n),
  },
  {
    type: `'b' | 'a' | 'd' | 'c'`,
    expectedArb: fc.constantFrom(`a`, `b`, `c`, `d`),
  },
  {
    type: `string | undefined`,
    expectedArb: fc.option(fc.string(), { nil: undefined }),
  },
  {
    type: `string | null`,
    expectedArb: fc.option(fc.string()),
  },
  {
    type: `string | undefined | null`,
    expectedArb: fc.oneof(fc.string(), fc.constantFrom(null, undefined)),
  },
  {
    type: `string | number`,
    expectedArb: fc.oneof(fc.string(), fc.double()),
  },
  {
    wrapArb: (code: string) => `
      (<UnconstrainedTypeParam>() => {
        ${code}
      })()
    `,
    type: `UnconstrainedTypeParam`,
    expectedArb: fc.anything(),
  },
  {
    wrapArb: (code: string) => `
      (<ConstrainedTypeParam extends string>() => {
        ${code}
      })()`,
    type: `ConstrainedTypeParam`,
    expectedArb: fc.string(),
  },
])(
  `typeToArbitrary transforms $type`,
  ({ setUp = ``, wrapArb = code => code, type, expectedArb, stringify }) => {
    const arb = typeToArbitrary(setUp, wrapArb, type)

    expect(sample(arb, stringify)).toStrictEqual(sample(expectedArb, stringify))
  },
)

const typeToArbitrary = (
  setUp: string,
  wrapArb: (code: string) => string,
  type: string,
) => {
  const sourceCode = [setUp, wrapArb(`const arb = typeToArbitrary<${type}>()`)]
    .filter(Boolean)
    .join(`\n\n`)

  const transformedCode = transformTypeScript(sourceCode).replaceAll(
    FAST_CHECK_IDENTIFIER_NAME,
    `fc`,
  )
  const arbCodeRegExp = /const arb =(?<arb>.*)/u
  const arbCode = arbCodeRegExp.exec(transformedCode)?.groups?.arb

  // eslint-disable-next-line typescript/no-implied-eval, no-new-func
  const arbitraryFunction = new Function(`fc`, `return ${arbCode}`) as (
    fastCheck: typeof fc,
  ) => fc.Arbitrary<unknown>
  return arbitraryFunction(fc)
}

const transformTypeScript = (code: string): string => {
  const fileName = `test.ts`
  const sourceFile = ts.createSourceFile(
    fileName,
    code,
    ts.ScriptTarget.ESNext,
    true,
  )
  const currentCompilerHost: ts.CompilerHost = {
    ...compilerHost,
    getSourceFile: (name, ...args) =>
      name === fileName
        ? sourceFile
        : compilerHost.getSourceFile.call(currentCompilerHost, name, ...args),
  }
  const program = ts.createProgram(
    [fileName],
    compilerOptions,
    currentCompilerHost,
  )

  const result = ts.transform(
    sourceFile,
    [createTransformer(program)],
    compilerOptions,
  )
  try {
    return printer.printFile(result.transformed[0]!)
  } finally {
    result.dispose()
  }
}

const compilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.Preserve,
  strict: true,
  lib: [`lib.esnext.full.d.ts`],
}
const compilerHost = ts.createCompilerHost(compilerOptions)
const printer = ts.createPrinter()

const sample = <T>(arb: fc.Arbitrary<T>, stringify = false): unknown[] => {
  const samples = fc.sample(arb, { seed: 42, numRuns: 5 })
  return stringify ? samples.map(fc.stringify) : samples
}
