import keyalesce from 'keyalesce'

export type Arbitrary =
  | ConstantArbitrary
  | OptionArbitrary
  | BooleanArbitrary
  | DoubleArbitrary
  | BigIntArbitrary
  | StringArbitrary
  | SymbolArbitrary
  | RecordArbitrary
  | ObjectArbitrary
  | ConstantFromArbitrary
  | OneofArbitrary
  | AnythingArbitrary

export type ConstantArbitrary = {
  type: `constant`
  value: unknown
}

export const constantArbitrary = (value: unknown): ConstantArbitrary =>
  memoize({ type: `constant`, value })

export type OptionArbitrary = {
  type: `option`
  arbitrary: Arbitrary
  nil: undefined | null
}

export const optionArbitrary = (props: {
  arbitrary: Arbitrary
  nil: undefined | null
}): OptionArbitrary => memoize({ type: `option`, ...props })

export type BooleanArbitrary = {
  type: `boolean`
}

export const booleanArbitrary = (): BooleanArbitrary =>
  memoize({ type: `boolean` })

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

export type SymbolArbitrary = {
  type: `symbol`
}

export const symbolArbitrary = (): SymbolArbitrary =>
  memoize({ type: `symbol` })

export type RecordArbitrary = {
  type: `record`
  properties: Record<
    PropertyKey,
    {
      required: boolean
      arbitrary: Arbitrary
    }
  >
}

export const recordArbitrary = (
  properties: Record<
    PropertyKey,
    {
      required: boolean
      arbitrary: Arbitrary
    }
  >,
): RecordArbitrary => memoize({ type: `record`, properties })

export type ObjectArbitrary = {
  type: `object`
}

export const objectArbitrary = (): ObjectArbitrary =>
  memoize({ type: `object` })

export type ConstantFromArbitrary = {
  type: `constantFrom`
  constants: unknown[]
}

export const constantFromArbitrary = (
  constants: unknown[],
): ConstantFromArbitrary => memoize({ type: `constantFrom`, constants })

export type OneofArbitrary = {
  type: `oneof`
  variants: Arbitrary[]
}

export const oneofArbitrary = (variants: Arbitrary[]): OneofArbitrary =>
  memoize({ type: `oneof`, variants })

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
    case `boolean`:
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
    case `record`:
      return keyalesce([
        arbitrary.type,
        ...Object.entries(arbitrary.properties).flatMap(
          ([name, { required, arbitrary }]) => [name, required, arbitrary],
        ),
      ])
    case `constantFrom`:
      return keyalesce([arbitrary.type, ...arbitrary.constants])
    case `oneof`:
      return keyalesce([arbitrary.type, ...arbitrary.variants])
  }
}

const arbitraryCache = new Map<ArbitraryKey, Arbitrary>()
type ArbitraryKey = ReturnType<typeof keyalesce>
