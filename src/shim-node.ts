/**
 * Node.js shim for @biscuit-auth/biscuit-wasm.
 *
 * Unlike the CF Workers shim (shim.ts), this version loads the WASM binary
 * from disk using node:fs + WebAssembly.Module, which works in any Node.js
 * runtime (tsx, vitest, plain node, etc.).
 *
 * We import directly from the npm package rather than vendoring copies.
 */

// @ts-nocheck — wasm-bindgen glue has no TS types

import { readFileSync } from "node:fs"
import { createRequire } from "node:module"

// Node.js: read the WASM binary from the npm package on disk
const _require = createRequire(import.meta.url)
const wasmPath = _require.resolve(
	"@biscuit-auth/biscuit-wasm/module/biscuit_bg.wasm",
)
const wasmModule = new WebAssembly.Module(readFileSync(wasmPath))

// wasm-bindgen JS glue from the npm package
import * as bg from "@biscuit-auth/biscuit-wasm/module/biscuit_bg.js"

// Collect all __wbg_* and __wbindgen_* functions as WASM imports.
// wasm-bindgen uses "./biscuit_bg.js" as the import module name.
const wasmImports: Record<string, unknown> = {}
for (const [key, value] of Object.entries(bg)) {
	if (key.startsWith("__wbg_") || key.startsWith("__wbindgen_")) {
		wasmImports[key] = value
	}
}

// The WASM binary also imports from snippet modules (all just performance.now())
const snippetExports = { performance_now: () => performance.now() }
const snippetModules = [
	"./snippets/biscuit-auth-1c48f52e9814dd36/inline0.js",
	"./snippets/biscuit-auth-314ca57174ae0e6d/inline0.js",
	"./snippets/biscuit-auth-4a94c16b4e5134af/inline0.js",
	"./snippets/biscuit-auth-9839c5a0e8279f50/inline0.js",
	"./snippets/biscuit-auth-da0d0cfccbdf8dc5/inline0.js",
	"./snippets/biscuit-auth-e52d23e03c1c6188/inline0.js",
	"./snippets/biscuit-auth-e5319c95bbe1e260/inline0.js",
]

// Synchronous instantiation
const imports: Record<string, Record<string, unknown>> = {
	"./biscuit_bg.js": wasmImports,
}
for (const path of snippetModules) {
	imports[path] = snippetExports
}
const instance = new WebAssembly.Instance(wasmModule, imports)

// Connect the WASM exports to the JS glue
bg.__wbg_set_wasm(instance.exports)

// Run the wasm-bindgen start function to initialize
const start = instance.exports.__wbindgen_start as () => void
start()

// Re-export everything from the JS glue (Biscuit, KeyPair, PublicKey, etc.)
export {
	AuthorizerBuilder,
	Biscuit,
	BiscuitBuilder,
	BlockBuilder,
	Check,
	Fact,
	KeyPair,
	Policy,
	PrivateKey,
	PublicKey,
	Rule,
	SignatureAlgorithm,
} from "@biscuit-auth/biscuit-wasm/module/biscuit_bg.js"

// --- Tagged template helpers (from upstream biscuit.js) ---

function prepareTerm(value: unknown): unknown {
	if (value instanceof Date) {
		return { date: value.toISOString() }
	}
	if (value instanceof Uint8Array) {
		return {
			bytes: [...value].map(b => b.toString(16).padStart(2, "0")).join(""),
		}
	}
	if (Array.isArray(value)) {
		return value.map(prepareTerm)
	}
	if (value instanceof Set) {
		return { set: Array.from(value).map(prepareTerm) }
	}
	if (value instanceof Map) {
		const map = new Map()
		for (const [k, v] of value) {
			map.set(prepareTerm(k), prepareTerm(v))
		}
		return { map }
	}
	if (typeof (value as any)?.toDatalogParameter === "function") {
		return (value as any).toDatalogParameter()
	}
	return value
}

function tagged(builder: any) {
	return (strings: TemplateStringsArray, ...values: unknown[]) => {
		let code = ""
		for (let i = 0; i < strings.length; i++) {
			code += strings[i]
			if (i < values.length) {
				code += `{param_${i}}`
			}
		}

		const termParameters = Object.fromEntries(
			values.map((v, i) => [`param_${i}`, prepareTerm(v)]),
		)

		const isKeyParam = (v: unknown) =>
			(typeof v === "string" && v.startsWith("ed25519/")) ||
			typeof (v as any)?.toDatalogParameter === "function"

		const keyParameters = Object.fromEntries(
			values
				.map((v, i) => [i, v] as const)
				.filter(([, v]) => isKeyParam(v))
				.map(([i, v]) => [`param_${i}`, prepareTerm(v)]),
		)

		builder.addCodeWithParameters(code, termParameters, keyParameters)
		return builder
	}
}

export function biscuit(strings: TemplateStringsArray, ...values: unknown[]) {
	const builder = bg.Biscuit.builder()
	return tagged(builder)(strings, ...values)
}

export function block(strings: TemplateStringsArray, ...values: unknown[]) {
	const builder = bg.Biscuit.block_builder()
	return tagged(builder)(strings, ...values)
}

export function authorizer(
	strings: TemplateStringsArray,
	...values: unknown[]
) {
	const builder = new bg.AuthorizerBuilder()
	return tagged(builder)(strings, ...values)
}
