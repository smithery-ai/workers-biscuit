import {
	KeyPair,
	SignatureAlgorithm,
	type PrivateKey,
	type PublicKey,
} from "./shim.js"

export function generateKeyPair() {
	const kp = new KeyPair(SignatureAlgorithm.Ed25519)
	return {
		privateKey: kp.getPrivateKey() as InstanceType<typeof PrivateKey>,
		publicKey: kp.getPublicKey() as InstanceType<typeof PublicKey>,
	}
}
