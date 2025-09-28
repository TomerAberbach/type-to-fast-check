import fs from 'node:fs/promises'
import { fc, test } from '@fast-check/vitest'
import { importFromString } from 'import-from-string'
import jsesc from 'jsesc'
import { expect } from 'vitest'
import type * as TestCases from './fixtures/test-cases.ts'
import { transpileTypeScript } from './typescript.ts'

const fixturesPath = `${import.meta.dirname}/fixtures`

const tsCode = await fs.readFile(`${fixturesPath}/test-cases.ts`, `utf8`)
const types = Array.from(
  tsCode.matchAll(/typeToArbitrary<(?<type>.+)>\(\)/gu),
  ({ groups }) => groups?.type ?? `?`,
)
const { transformedTsCode, jsCode, errorDiagnostics } = transpileTypeScript(
  tsCode,
  { transform: true },
)
const testCases = (
  (await importFromString(jsCode)) as typeof TestCases
).default.map((testCase, index) => ({ type: types[index]!, ...testCase }))

test(`typeToArbitrary is transformed`, async () => {
  expect(errorDiagnostics).toStrictEqual([])
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
  )(`typeToArbitrary<${type}>() generates correct types`, (context, values) => {
    const statement = `export const check: Array<${type}> = [${values
      .map(toJs)
      .join(`, `)}]`
    context.log(statement)

    const { errorDiagnostics } = transpileTypeScript(
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
      return jsesc(value, { wrap: true })
    case `symbol`:
      return `Symbol(${
        value.description === undefined
          ? ``
          : jsesc(value.description, { wrap: true })
      })`
    case `function`:
      return fc.stringify(value)
  }
}
