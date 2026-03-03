# @smithery/biscuit

Cloudflare Workers adapter for [`@biscuit-auth/biscuit-wasm`](https://github.com/biscuit-auth/biscuit-wasm).

The upstream package targets bundlers (`wasm-pack --target bundler`), which expect the bundler to handle WASM instantiation. Cloudflare Workers import `.wasm` files as pre-compiled `WebAssembly.Module` objects, so this package manually instantiates the module and wires it to the JS glue code.

## Usage

```typescript
import {
  Biscuit,
  KeyPair,
  AuthorizerBuilder,
  biscuit,
  block,
  authorizer,
  generateKeyPair,
} from "@smithery/biscuit"

// Generate keys
const { privateKey, publicKey } = generateKeyPair()

// Mint a token using the tagged template helper
const builder = biscuit`user("alice"); check if time($t), $t <= ${new Date(Date.now() + 3600_000)};`
const token = builder.build(privateKey)

// Attenuate with a restriction block
const restricted = token.appendBlock(
  block`check if operation($op), ["read"].contains($op);`
)

// Verify
const auth = authorizer`time(${new Date()}); operation("read"); allow if true;`
const verifier = auth.buildAuthenticated(restricted)
verifier.authorize() // throws if checks fail
```

## Exports

| Path | Contents |
|------|----------|
| `@smithery/biscuit` | All biscuit-wasm classes, tagged template helpers, `generateKeyPair()` |
| `@smithery/biscuit/shim` | Raw WASM shim re-exports only |

## How it works

The shim (`src/shim.ts`) does three things:

1. Imports the `.wasm` binary as a CF Workers `WebAssembly.Module`
2. Collects `__wbg_*` / `__wbindgen_*` glue functions from the JS bindings
3. Synchronously instantiates the WASM module and connects it to the glue

This is ~60 lines of code. Everything else is re-exported from `@biscuit-auth/biscuit-wasm`.

## Upstream patch

The shim imports internal files from `@biscuit-auth/biscuit-wasm` (`module/biscuit_bg.js` and `module/biscuit_bg.wasm`) that are not listed in the package's `exports` field. Modern bundlers (including Wrangler's esbuild) enforce `exports` strictly and refuse to resolve these subpaths.

A pnpm patch at `patches/@biscuit-auth__biscuit-wasm@0.6.0.patch` adds the missing subpath exports. If you upgrade `@biscuit-auth/biscuit-wasm`, regenerate the patch with `pnpm patch` and verify the shim still bundles under `wrangler dev`.
