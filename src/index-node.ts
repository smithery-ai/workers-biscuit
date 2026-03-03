/**
 * @biscuit-auth/biscuit-wasm adapter for Node.js.
 *
 * Re-exports all biscuit-wasm classes through a Node.js-compatible
 * WASM shim, plus tagged template helpers for writing Datalog.
 */

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
} from "./shim-node.js"

import {
	KeyPair,
	type PrivateKey,
	type PublicKey,
	SignatureAlgorithm,
} from "./shim-node.js"

export function generateKeyPair() {
	const kp = new KeyPair(SignatureAlgorithm.Ed25519)
	return {
		privateKey: kp.getPrivateKey() as InstanceType<typeof PrivateKey>,
		publicKey: kp.getPublicKey() as InstanceType<typeof PublicKey>,
	}
}
