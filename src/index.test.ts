import fs from 'node:fs/promises'
import { fc, test } from '@fast-check/vitest'
import { importFromString } from 'import-from-string'
import ts from 'typescript'
import { expect } from 'vitest'
import type * as TestCases from './fixtures/test-cases.ts'
import createTransformer from './transformer.ts'

const transformTypeScript = (code: string): string => {
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
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
  return transpileResult.outputText
}

const getTestCases = async () => {
  const code = transformTypeScript(
    await fs.readFile(`${import.meta.dirname}/fixtures/test-cases.ts`, `utf8`),
  )
  const testCases = (await importFromString(code)) as typeof TestCases
  return Object.entries(testCases).map(([name, testCase]) => ({
    name,
    ...testCase,
  }))
}

test.each(await getTestCases())(
  `typeToArbitrary transforms $name`,
  ({ actual, expected, stringify }) => {
    expect(sample(actual, stringify)).toStrictEqual(sample(expected, stringify))
  },
)

const sample = <T>(arb: fc.Arbitrary<T>, stringify = false): unknown[] => {
  let samples: unknown[]
  try {
    samples = fc.sample(arb, { seed: 42, numRuns: 5 })
  } catch (error: unknown) {
    samples = [error]
  }
  return stringify ? samples.map(fc.stringify) : samples
}
