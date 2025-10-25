import type * as fc from 'fast-check'
import type { Double, Integer } from './meta-types.ts'

export declare const metaSymbol: unique symbol

export type Meta = (
  | Integer<fc.IntegerConstraints | undefined>
  | Double<fc.DoubleConstraints | undefined>
)[typeof metaSymbol]

export type MetaType = Meta[`type`]

export const META_TYPES = new Set(
  Object.keys({
    integer: true,
    double: true,
  } satisfies Record<MetaType, true>),
) as ReadonlySet<MetaType>
