/**
 * @biscuit-auth/biscuit-wasm adapter for Node.js.
 *
 * Re-exports all biscuit-wasm classes through a Node.js-compatible
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
} from "./shim-node.js"

import {
	KeyPair,
	SignatureAlgorithm,
	type PrivateKey,
	type PublicKey,
} from "./shim-node.js"

export function generateKeyPair() {
	const kp = new KeyPair(SignatureAlgorithm.Ed25519)
	return {
		privateKey: kp.getPrivateKey() as InstanceType<typeof PrivateKey>,
		publicKey: kp.getPublicKey() as InstanceType<typeof PublicKey>,
	}
}
