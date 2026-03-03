/**
 * @biscuit-auth/biscuit-wasm adapter for Cloudflare Workers.
 *
 * Re-exports all biscuit-wasm classes through a CF Workers-compatible
 * WASM shim, plus tagged template helpers for writing Datalog.
 */

export {
	Biscuit,
	BiscuitBuilder,
	BlockBuilder,
	KeyPair,
	PrivateKey,
	PublicKey,
	AuthorizerBuilder,
	SignatureAlgorithm,
	Fact,
	Rule,
	Check,
	Policy,
	biscuit,
	block,
	authorizer,
} from "./shim.js"

export { generateKeyPair } from "./helpers.js"
