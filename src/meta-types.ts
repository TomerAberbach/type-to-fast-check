import type * as fc from 'fast-check'
import type { metaSymbol } from './meta.ts'

export type Integer<
  Constraints extends fc.IntegerConstraints | undefined = undefined,
> = { [metaSymbol]: { type: `integer`; constraints: Constraints } }

export type Double<
  Constraints extends fc.DoubleConstraints | undefined = undefined,
> = { [metaSymbol]: { type: `double`; constraints: Constraints } }
