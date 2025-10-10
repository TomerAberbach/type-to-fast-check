import fs from 'node:fs/promises'
import { fc, test } from '@fast-check/vitest'
import { importFromString } from 'import-from-string'
import jsesc from 'jsesc'
import ts from 'typescript'
import { expect } from 'vitest'
import type * as TestCases from './fixtures/test-cases.ts'
import { formatDiagnostic, transpileTypeScript } from './typescript.ts'

const fixturesPath = `${import.meta.dirname}/fixtures`

const tsCode = await fs.readFile(`${fixturesPath}/test-cases.ts`, `utf8`)
const types = Array.from(
  tsCode.matchAll(/typeToArb<(?<type>(?:.|\n)(?:.|\n)*?)>\(\)/gu),
  ({ groups }) => groups?.type ?? `?`,
)
const { transformedTsCode, jsCode, diagnostics } = await transpileTypeScript(
  tsCode,
  { transform: true },
)
const testCases = (
  (await importFromString(jsCode)) as typeof TestCases
).default.map((testCase, index) => ({ type: types[index]!, ...testCase }))

test(`typeToArb is transformed`, async () => {
  expect(diagnostics.map(formatDiagnostic)).toMatchInlineSnapshot(`
    [
      "test0.ts(315,28): warning TStype-to-fast-check: Cannot dynamically generate type parameter arbitrary. Using its constraint type.",
      "test0.ts(315,28): warning TStype-to-fast-check: Type parameter has no constraint type. Using \`unknown\`.",
      "test0.ts(319,43): warning TStype-to-fast-check: Cannot dynamically generate type parameter arbitrary. Using its constraint type.",
    ]
  `)
  await expect(transformedTsCode).toMatchFileSnapshot(
    `${fixturesPath}/test-cases.transformed.ts`,
  )
})

const BATCH_SIZE = 5

for (const { type, arb, typecheck = true } of testCases) {
  if (!typecheck) {
    continue
  }

  test.prop(
    [
      fc.context(),
      fc.array(arb, { minLength: BATCH_SIZE, maxLength: BATCH_SIZE }),
    ],
    { numRuns: 100 / BATCH_SIZE },
  )(`typeToArb<${type}>() generates correct types`, async (context, values) => {
    const statement = `export const check: Array<${type}> = [${values
      .map(toJs)
      .join(`, `)}]`
    context.log(statement)

    const { diagnostics } = await transpileTypeScript(
      [
        // For when `type` references something defined in `test-cases.ts`
        tsCode,
        // For when `fast-check` generated functions are referenced
        `declare const hash: (value: unknown) => number`,
        `declare const stringify: (value: unknown) => string`,
        // The actual statement to typecheck
        statement,
      ].join(`\n`),
    )

    const errorDiagnostics = diagnostics
      .filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error)
      .map(formatDiagnostic)
    expect(errorDiagnostics).toStrictEqual([])
  })
}

const toJs = (value: unknown) => {
  switch (typeof value) {
    case `boolean`:
    case `number`:
    case `bigint`:
    case `string`:
    case `undefined`:
    case `object`:
    case `function`:
      return jsesc(value, { wrap: true })
    case `symbol`:
      return `Symbol(${
        value.description === undefined
          ? ``
          : jsesc(value.description, { wrap: true })
      })`
  }
}
