import keyalesce from 'keyalesce'

export type Arbitrary =
  | NeverArbitrary
  | ConstantArbitrary
  | OptionArbitrary
  | BooleanArbitrary
  | DoubleArbitrary
  | BigIntArbitrary
  | StringArbitrary
  | SymbolArbitrary
  | ArrayArbitrary
  | TupleArbitrary
  | RecordArbitrary
  | ObjectArbitrary
  | FuncArbitrary
  | ConstantFromArbitrary
  | OneofArbitrary
  | AnythingArbitrary

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

export type ArrayArbitrary = {
  type: `array`
  items: Arbitrary
}

export const arrayArbitrary = (
  items: ArrayArbitrary[`items`],
): ArrayArbitrary => memoize({ type: `array`, items })

export type TupleArbitrary = {
  type: `tuple`
  elements: Arbitrary[]
}

export const tupleArbitrary = (
  elements: TupleArbitrary[`elements`],
): TupleArbitrary => memoize({ type: `tuple`, elements })

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
    case `never`:
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
    case `array`:
      return keyalesce([arbitrary.type, arbitrary.items])
    case `tuple`:
      return keyalesce([arbitrary.type, ...arbitrary.elements])
    case `record`:
      return keyalesce([
        arbitrary.type,
        ...[...arbitrary.properties].flatMap(
          ([name, { required, arbitrary }]) => [name, required, arbitrary],
        ),
      ])
    case `func`:
      return keyalesce([arbitrary.type, arbitrary.result])
    case `constantFrom`:
      return keyalesce([arbitrary.type, ...arbitrary.constants])
    case `oneof`:
      return keyalesce([arbitrary.type, ...arbitrary.variants])
  }
}

const arbitraryCache = new Map<ArbitraryKey, Arbitrary>()
type ArbitraryKey = ReturnType<typeof keyalesce>
