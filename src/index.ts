/**
 * @biscuit-auth/biscuit-wasm adapter for Cloudflare Workers.
 *
 * Re-exports all biscuit-wasm classes through a CF Workers-compatible
 * WASM shim, plus tagged template helpers for writing Datalog.
 */

export { generateKeyPair } from "./helpers.js"
export {
	AuthorizerBuilder,
	authorizer,
	Biscuit,
	BiscuitBuilder,
	BlockBuilder,
	biscuit,
	block,
	Check,
	Fact,
	KeyPair,
	Policy,
	PrivateKey,
	PublicKey,
	Rule,
	SignatureAlgorithm,
} from "./shim.js"
