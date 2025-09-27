import config from '@tomer/eslint-config'

export default [
  ...config,
  { ignores: [`src/fixtures/test-cases.transformed.ts`] },
]
