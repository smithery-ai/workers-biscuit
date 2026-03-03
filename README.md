# @smithery/biscuit

[![npm version](https://img.shields.io/npm/v/@smithery/biscuit.svg)](https://www.npmjs.com/package/@smithery/biscuit)

[Biscuit](https://www.biscuitsec.org/) authorization tokens for Cloudflare Workers and Node.js.

This package wraps [`@biscuit-auth/biscuit-wasm`](https://github.com/biscuit-auth/biscuit-wasm) with runtime-specific WASM shims so you can use Biscuit tokens in Cloudflare Workers (which require synchronous `WebAssembly.Module` instantiation) and Node.js without any extra configuration.

## Install

```bash
pnpm add @smithery/biscuit
```

## Usage

```typescript
import {
  biscuit,
  block,
  authorizer,
  generateKeyPair,
} from "@smithery/biscuit"

// Generate keys
const { privateKey, publicKey } = generateKeyPair()

// Mint a token with Datalog using tagged template helpers
const token = biscuit`
  user("alice");
  check if time($t), $t <= ${new Date(Date.now() + 3600_000)};
`.build(privateKey)

// Attenuate — restrictions can only narrow, never widen
const restricted = token.appendBlock(
  block`check if operation($op), ["read"].contains($op);`
)

// Verify
const auth = authorizer`
  time(${new Date()});
  operation("read");
  allow if true;
`
auth.buildAuthenticated(restricted).authorize() // throws if checks fail
```

The tagged template helpers (`biscuit`, `block`, `authorizer`) automatically convert JS values into Datalog terms — `Date` becomes a timestamp, `Uint8Array` becomes hex bytes, `Set` and `Map` are supported, and any object with a `toDatalogParameter()` method works as a custom term.

## Exports

| Path | Contents |
|------|----------|
| `@smithery/biscuit` | All biscuit-wasm classes, tagged template helpers, `generateKeyPair()` |
| `@smithery/biscuit/shim` | Raw WASM shim re-exports only |

The package uses conditional exports: the `workerd` condition resolves to the Cloudflare Workers shim, and `default` resolves to the Node.js shim.

## How it works

The upstream package targets bundlers (`wasm-pack --target bundler`), which expect the bundler to handle WASM instantiation. Cloudflare Workers import `.wasm` files as pre-compiled `WebAssembly.Module` objects instead, so this package manually instantiates the module and wires it to the JS glue code.

The shim (`src/shim.ts`) does three things:

1. Imports the `.wasm` binary as a CF Workers `WebAssembly.Module`
2. Collects `__wbg_*` / `__wbindgen_*` glue functions from the JS bindings
3. Synchronously instantiates the WASM module and connects it to the glue

## Upstream patch

The shim imports internal files from `@biscuit-auth/biscuit-wasm` (`module/biscuit_bg.js` and `module/biscuit_bg.wasm`) that are not listed in the package's `exports` field. Modern bundlers (including Wrangler's esbuild) enforce `exports` strictly and refuse to resolve these subpaths.

A pnpm patch at `patches/@biscuit-auth__biscuit-wasm@0.6.0.patch` adds the missing subpath exports. If you upgrade `@biscuit-auth/biscuit-wasm`, regenerate the patch with `pnpm patch` and verify the shim still bundles under `wrangler dev`.

## License

MIT
