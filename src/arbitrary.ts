import keyalesce from 'keyalesce'
import type { Meta } from './meta.ts'

export type Arbitrary =
  | MutableArbitrary
  | TieArbitrary
  | MetaArbitrary
  | NeverArbitrary
  | ConstantArbitrary
  | OptionArbitrary
  | BooleanArbitrary
  | IntegerArbitrary
  | DoubleArbitrary
  | BigIntArbitrary
  | StringArbitrary
  | TemplateArbitrary
  | MapStringArbitrary
  | SymbolArbitrary
  | TupleArbitrary
  | ArrayArbitrary
  | RecordArbitrary
  | DictionaryArbitrary
  | ObjectArbitrary
  | FuncArbitrary
  | ConstantFromArbitrary
  | OneofArbitrary
  | AssignArbitrary
  | AnythingArbitrary

export type MutableArbitrary = {
  type: `mutable`
  value: Arbitrary | null
}

export const mutableArbitrary = (
  value: MutableArbitrary[`value`],
): MutableArbitrary =>
  // This is not memoized because each `mutable` arbitrary is different.
  ({ type: `mutable`, value })

export type TieArbitrary = {
  type: `tie`
  arbitrary: Arbitrary
}

export const tieArbitrary = (
  arbitrary: TieArbitrary[`arbitrary`],
): TieArbitrary =>
  // This is not memoized because each `tie` arbitrary is different.
  ({ type: `tie`, arbitrary })

export type MetaArbitrary = {
  type: `meta`
  arbitrary: Arbitrary
  meta: Meta
}

export const metaArbitrary = (
  props: Pick<MetaArbitrary, `arbitrary` | `meta`>,
): MetaArbitrary => memoize({ type: `meta`, ...props })

export type NeverArbitrary = {
  type: `never`
}

export const neverArbitrary = (): NeverArbitrary => memoize({ type: `never` })

export type ConstantArbitrary = {
  type: `constant`
  value: unknown
}

export const constantArbitrary = (
  value: ConstantArbitrary[`value`],
): ConstantArbitrary => memoize({ type: `constant`, value })

export type OptionArbitrary = {
  type: `option`
  arbitrary: Arbitrary
  nil: undefined | null
}

export const optionArbitrary = (
  props: Pick<OptionArbitrary, `arbitrary` | `nil`>,
): OptionArbitrary => memoize({ type: `option`, ...props })

export type BooleanArbitrary = {
  type: `boolean`
}

export const booleanArbitrary = (): BooleanArbitrary =>
  memoize({ type: `boolean` })

export type IntegerArbitrary = {
  type: `integer`
}

export const integerArbitrary = (): IntegerArbitrary =>
  memoize({ type: `integer` })

export type DoubleArbitrary = {
  type: `double`
}

export const doubleArbitrary = (): DoubleArbitrary =>
  memoize({ type: `double` })

export type BigIntArbitrary = {
  type: `bigInt`
}

export const bigIntArbitrary = (): BigIntArbitrary =>
  memoize({ type: `bigInt` })

export type StringArbitrary = {
  type: `string`
}

export const stringArbitrary = (): StringArbitrary =>
  memoize({ type: `string` })

export type TemplateArbitrary = {
  type: `template`
  segments: (string | Arbitrary)[]
}

export const templateArbitrary = (
  segments: TemplateArbitrary[`segments`],
): TemplateArbitrary => memoize({ type: `template`, segments })

export type MapStringArbitrary = {
  type: `mapString`
  arbitrary: Arbitrary
  operation: `lowercase` | `uppercase` | `uncapitalize` | `capitalize`
}

export const mapStringArbitrary = (
  props: Pick<MapStringArbitrary, `arbitrary` | `operation`>,
): MapStringArbitrary => memoize({ type: `mapString`, ...props })

export type SymbolArbitrary = {
  type: `symbol`
}

export const symbolArbitrary = (): SymbolArbitrary =>
  memoize({ type: `symbol` })

export type TupleArbitrary = {
  type: `tuple`
  elements: { arbitrary: Arbitrary; rest: boolean }[]
}

export const tupleArbitrary = (
  elements: TupleArbitrary[`elements`],
): TupleArbitrary => memoize({ type: `tuple`, elements })

export type ArrayArbitrary = {
  type: `array`
  items: Arbitrary
}

export const arrayArbitrary = (
  items: ArrayArbitrary[`items`],
): ArrayArbitrary => memoize({ type: `array`, items })

export type RecordArbitrary = {
  type: `record`
  properties: Map<
    PropertyKey,
    {
      required: boolean
      arbitrary: Arbitrary
    }
  >
}

export const recordArbitrary = (
  properties: RecordArbitrary[`properties`],
): RecordArbitrary => memoize({ type: `record`, properties })

export type DictionaryArbitrary = {
  type: `dictionary`
  key: Arbitrary
  value: Arbitrary
}

export const dictionaryArbitrary = (
  props: Pick<DictionaryArbitrary, `key` | `value`>,
): DictionaryArbitrary => memoize({ type: `dictionary`, ...props })

export type ObjectArbitrary = {
  type: `object`
}

export const objectArbitrary = (): ObjectArbitrary =>
  memoize({ type: `object` })

export type FuncArbitrary = {
  type: `func`
  result: Arbitrary
}

export const funcArbitrary = (result: FuncArbitrary[`result`]): FuncArbitrary =>
  memoize({ type: `func`, result })

export type ConstantFromArbitrary = {
  type: `constantFrom`
  constants: unknown[]
}

export const constantFromArbitrary = (
  constants: ConstantFromArbitrary[`constants`],
): ConstantFromArbitrary => memoize({ type: `constantFrom`, constants })

export type OneofArbitrary = {
  type: `oneof`
  variants: Arbitrary[]
}

export const oneofArbitrary = (
  variants: OneofArbitrary[`variants`],
): OneofArbitrary => memoize({ type: `oneof`, variants })

export type AssignArbitrary = {
  type: `assign`
  arbitraries: Arbitrary[]
}

export const assignArbitrary = (
  arbitraries: AssignArbitrary[`arbitraries`],
): AssignArbitrary => memoize({ type: `assign`, arbitraries })

export type AnythingArbitrary = {
  type: `anything`
}

export const anythingArbitrary = (): AnythingArbitrary =>
  memoize({ type: `anything` })

const memoize = <A extends Arbitrary>(arbitrary: A): A => {
  const arbitraryKey = getArbitraryKey(arbitrary)
  let cachedArbitrary = arbitraryCache.get(arbitraryKey)
  if (!cachedArbitrary) {
    cachedArbitrary = arbitrary
    arbitraryCache.set(arbitraryKey, cachedArbitrary)
  }
  return cachedArbitrary as A
}

const getArbitraryKey = (arbitrary: Arbitrary): ArbitraryKey => {
  switch (arbitrary.type) {
    /* c8 ignore start */
    case `mutable`:
    case `tie`:
      throw new Error(`Unsupported type`)
    /* c8 ignore end */
    case `meta`:
      return keyalesce([
        arbitrary.type,
        arbitrary.arbitrary,
        JSON.stringify(arbitrary.meta),
      ])
    case `never`:
    case `boolean`:
    case `integer`:
    case `double`:
    case `bigInt`:
    case `string`:
    case `symbol`:
    case `object`:
    case `anything`:
      return keyalesce([arbitrary.type])
    case `constant`:
      return keyalesce([arbitrary.type, arbitrary.value])
    case `option`:
      return keyalesce([arbitrary.type, arbitrary.arbitrary, arbitrary.nil])
    case `template`:
      return keyalesce([arbitrary.type, ...arbitrary.segments])
    case `mapString`:
      return keyalesce([
        arbitrary.type,
        arbitrary.arbitrary,
        arbitrary.operation,
      ])
    case `tuple`:
      return keyalesce([
        arbitrary.type,
        ...arbitrary.elements.flatMap(({ arbitrary, rest }) => [
          arbitrary,
          rest,
        ]),
      ])
    case `array`:
      return keyalesce([arbitrary.type, arbitrary.items])
    case `record`:
      return keyalesce([
        arbitrary.type,
        ...[...arbitrary.properties].flatMap(
          ([name, { required, arbitrary }]) => [name, required, arbitrary],
        ),
      ])
    case `dictionary`:
      return keyalesce([arbitrary.type, arbitrary.key, arbitrary.value])
    case `func`:
      return keyalesce([arbitrary.type, arbitrary.result])
    case `constantFrom`:
      return keyalesce([arbitrary.type, ...arbitrary.constants])
    case `oneof`:
      return keyalesce([arbitrary.type, ...arbitrary.variants])
    case `assign`:
      return keyalesce([arbitrary.type, ...arbitrary.arbitraries])
  }
}

const arbitraryCache = new Map<ArbitraryKey, Arbitrary>()
type ArbitraryKey = ReturnType<typeof keyalesce>

export const collectTieArbitraries = (
  arbitrary: Arbitrary,
): Set<TieArbitrary> => {
  const tieArbitraries = new Set<TieArbitrary>()
  const visitArbitrary = (arbitrary: Arbitrary) => {
    switch (arbitrary.type) {
      case `mutable`:
        if (arbitrary.value) {
          visitArbitrary(arbitrary.value)
        }
        break
      case `meta`:
        visitArbitrary(arbitrary.arbitrary)
        break
      case `never`:
      case `constant`:
      case `boolean`:
      case `integer`:
      case `double`:
      case `bigInt`:
      case `string`:
      case `symbol`:
      case `object`:
      case `constantFrom`:
      case `anything`:
        break
      case `template`:
        for (const segment of arbitrary.segments) {
          if (typeof segment !== `string`) {
            visitArbitrary(segment)
          }
        }
        break
      case `mapString`:
        visitArbitrary(arbitrary.arbitrary)
        break
      case `tuple`:
        for (const element of arbitrary.elements) {
          visitArbitrary(element.arbitrary)
        }
        break
      case `array`:
        visitArbitrary(arbitrary.items)
        break
      case `record`:
        for (const property of arbitrary.properties.values()) {
          visitArbitrary(property.arbitrary)
        }
        break
      case `dictionary`:
        visitArbitrary(arbitrary.key)
        visitArbitrary(arbitrary.value)
        break
      case `func`:
        visitArbitrary(arbitrary.result)
        break
      case `option`:
        visitArbitrary(arbitrary.arbitrary)
        break
      case `oneof`:
        for (const variant of arbitrary.variants) {
          visitArbitrary(variant)
        }
        break
      case `assign`:
        for (const arb of arbitrary.arbitraries) {
          visitArbitrary(arb)
        }
        break
      case `tie`:
        if (!tieArbitraries.has(arbitrary)) {
          tieArbitraries.add(arbitrary)
          visitArbitrary(arbitrary.arbitrary)
        }
        break
    }
  }
  visitArbitrary(arbitrary)
  return tieArbitraries
}
