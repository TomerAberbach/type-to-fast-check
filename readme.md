<h1 align="center">
  type-to-fast-check
</h1>

<div align="center">
  <a href="https://npmjs.org/package/type-to-fast-check">
    <img src="https://badgen.net/npm/v/type-to-fast-check" alt="version" />
  </a>
  <a href="https://github.com/TomerAberbach/type-to-fast-check/actions">
    <img src="https://github.com/TomerAberbach/type-to-fast-check/workflows/CI/badge.svg" alt="CI" />
  </a>
  <a href="https://github.com/sponsors/TomerAberbach">
    <img src="https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub&color=%23fe8e86" alt="Sponsor" />
  </a>
</div>

<div align="center">
  Automatically convert TypeScript types to <a href="https://github.com/dubzzz/fast-check">fast-check</a> arbitraries!
</div>

> [!NOTE]
>
> This package is in a **beta** state and I'm excited for you to try it out!
>
> I'd love your feedback! Share any suggestions, bug reports, feature requests,
> or general thoughts by
> [filing an issue](https://github.com/TomerAberbach/type-to-fast-check/issues/new).

## Install

```sh
$ npm i --save-dev type-to-fast-check fast-check
```

## Usage

```ts
import * as fc from 'fast-check'
import typeToArb from 'type-to-fast-check'

type User = {
  firstName: string
  lastName: string
}

const userArb = typeToArb<User>()

fc.assert(
  fc.property(userArb, user => {
    // ...
  }),
)
```

The following code:

```ts
const userArb = typeToArb<User>()
```

Compiles to:

```ts
const userArb = fc.record({
  firstName: fc.string(),
  lastName: fc.string(),
})
```

You can pass any type to `typeToArb`!

## Configure

1. Add the transformer plugin to your
   [`tsconfig.json`](https://www.typescriptlang.org/tsconfig/#plugins):

   ```json
   {
     "compilerOptions": {
       "plugins": [{ "transform": "type-to-fast-check/transformer" }]
     }
   }
   ```

2. [Set up `ts-patch`](https://github.com/nonara/ts-patch#method-2-persistent-patch)
   to apply the configured plugin:
   1. Install:

      ```sh
      $ npm i --save-dev ts-patch
      ```

   1. Run for the first time:

      ```sh
      $ ts-patch install
      ```

   1. Configure to run after `npm install`:

      **package.json**

      ```json
      {
        "scripts": {
          "prepare": "ts-patch install -s"
        }
      }
      ```

3. Configure your test runner to run
   [`tsc`](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
   if it doesn't by default:
   - [`vitest`](https://vitest.dev) (uses [`esbuild`](https://esbuild.github.io)
     and doesn't run `tsc`)
     1. Install [Rollup](http://rollupjs.org) plugin:

        ```sh
        npm i --save-dev @rollup/plugin-typescript
        ```

     2. Add the plugin to your [`vitest.config.ts`](https://vitest.dev/config):

        **vitest.config.ts**

        ```ts
        import typescript from '@rollup/plugin-typescript'
        import { defineConfig } from 'vitest/config'

        export default defineConfig({
          // ...
          plugins: [typescript()],
        })
        ```

   - _Send me PRs for configuring other test runners!_

## Roadmap

See
[the issue tracker](https://github.com/TomerAberbach/type-to-fast-check/issues)!
Share any suggestions, bug reports, feature requests, or general thoughts by
[filing an issue](https://github.com/TomerAberbach/type-to-fast-check/issues/new).

## Contributing

Stars are always welcome!

For bugs and feature requests,
[please create an issue](https://github.com/TomerAberbach/type-to-fast-check/issues/new).

## License

[MIT](https://github.com/TomerAberbach/type-to-fast-check/blob/main/license) ©
[Tomer Aberbach](https://github.com/TomerAberbach)
