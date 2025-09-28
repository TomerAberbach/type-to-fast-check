import fs from 'node:fs/promises'
import { fc, test } from '@fast-check/vitest'
import { importFromString } from 'import-from-string'
import jsesc from 'jsesc'
import ts from 'typescript'
import { expect } from 'vitest'
import { FAST_CHECK_IDENTIFIER_NAME } from './fast-check.ts'
import type * as TestCases from './fixtures/test-cases.ts'
import createTransformer from './transformer.ts'

const transformTypeScript = (
  code: string,
): {
  transformedTsCode: string
  jsCode: string
  errorDiagnostics: string[]
} => {
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
    lib: [`lib.esnext.full.d.ts`],
  }
  const compilerHost = ts.createCompilerHost(compilerOptions)

  const fileName = `test.ts`
  const sourceFile = ts.createSourceFile(
    fileName,
    code,
    ts.ScriptTarget.ESNext,
    true,
  )
  const originalGetSourceFile = compilerHost.getSourceFile.bind(compilerHost)
  compilerHost.getSourceFile = (name, ...args) =>
    name === fileName ? sourceFile : originalGetSourceFile(name, ...args)
  const program = ts.createProgram([fileName], compilerOptions, compilerHost)

  const transformResult = ts.transform(
    sourceFile,
    [createTransformer(program)],
    compilerOptions,
  )
  let transformedCode: string
  try {
    transformedCode = ts
      .createPrinter()
      .printFile(transformResult.transformed[0]!)
  } finally {
    transformResult.dispose()
  }

  const transpileResult = ts.transpileModule(transformedCode, {
    compilerOptions,
  })
  const errorDiagnostics = [
    ...program.getSyntacticDiagnostics(sourceFile),
    ...program.getSemanticDiagnostics(sourceFile),
    ...program.getGlobalDiagnostics(),
    ...(transformResult.diagnostics ?? []),
    ...(transpileResult.diagnostics ?? []),
  ]
    .filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error)
    // eslint-disable-next-line typescript/no-base-to-string
    .map(diagnostic => String(diagnostic.messageText))

  return {
    transformedTsCode: transformedCode,
    jsCode: transpileResult.outputText,
    errorDiagnostics,
  }
}

const tsCode = await fs.readFile(
  `${import.meta.dirname}/fixtures/test-cases.ts`,
  `utf8`,
)
const { transformedTsCode, jsCode, errorDiagnostics } =
  transformTypeScript(tsCode)
console.log(jsCode.replaceAll(FAST_CHECK_IDENTIFIER_NAME, `fc`))

test(`typeToArbitrary transforms`, async () => {
  await expect(transformedTsCode).toMatchFileSnapshot(
    `${import.meta.dirname}/fixtures/test-cases.transformed.ts`,
  )
})

const getTestCases = async () => {
  expect(errorDiagnostics).toStrictEqual([])

  const typeMatches = Array.from(
    tsCode.matchAll(/typeToArbitrary<(?<type>.+)>\(\)/gu),
    ({ groups }) => groups?.type ?? `?`,
  )
  const testCases = ((await importFromString(jsCode)) as typeof TestCases)
    .default

  return testCases.map((testCase, index) => ({
    type: typeMatches[index]!,
    ...testCase,
  }))
}

// TODO(#19): Run these using property-based tests.
test.each(await getTestCases())(
  `typeToArbitrary transforms $type`,
  ({ type, actual, expected, roundtrippable = true }) => {
    const { samples, errorDiagnostics } = sampleAndTypecheck(
      type,
      actual,
      roundtrippable,
    )

    expect(samples).toStrictEqual(sample(expected, roundtrippable).transformed)
    expect(errorDiagnostics).toStrictEqual([])
  },
)

const sampleAndTypecheck = <T>(
  type: string,
  arb: fc.Arbitrary<T>,
  roundtrippable: boolean,
): { samples: unknown[]; errorDiagnostics: string[] } => {
  const samples = sample(arb, roundtrippable)
  if (!roundtrippable) {
    return { samples: samples.transformed, errorDiagnostics: [] }
  }

  const checkStatement = `export const check: Array<${type}> = ${jsesc(
    samples.raw,
  )}`
  console.log(checkStatement)
  const { errorDiagnostics } = transformTypeScript(
    [
      // Include the test cases code for referenced types.
      tsCode,
      checkStatement,
    ].join(`\n`),
  )

  return { samples: samples.transformed, errorDiagnostics }
}

const sample = (
  arb: fc.Arbitrary<unknown>,
  roundtrippable: boolean,
): { raw: unknown[]; transformed: unknown[] } => {
  let samples: unknown[]
  try {
    samples = fc.sample(arb, { seed: 42, numRuns: 5 })
  } catch (error: unknown) {
    samples = [error]
  }

  return {
    raw: samples,
    transformed: roundtrippable ? samples : samples.map(fc.stringify),
  }
}
