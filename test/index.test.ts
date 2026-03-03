// Use npm package directly for Node.js test environment
// (the WASM shim is for CF Workers only)
// @ts-expect-error — biscuit-wasm types are loose
import { AuthorizerBuilder, Biscuit, KeyPair } from "@biscuit-auth/biscuit-wasm"
import { beforeAll, describe, expect, it } from "vitest"

function setup() {
	const kp = new KeyPair("Ed25519")
	return { privateKey: kp.getPrivateKey(), publicKey: kp.getPublicKey() }
}

// Warm up the WASM JIT before tests run. The first authorize() call
// is slow due to JIT compilation and can exceed Datalog RunLimits on CI.
// Even if it throws Timeout, the JIT has been exercised for subsequent calls.
beforeAll(() => {
	const { privateKey } = setup()
	const b = Biscuit.builder()
	b.addCode('warmup("jit");')
	const token = b.build(privateKey)
	const ab = new AuthorizerBuilder()
	ab.addCode("allow if true;")
	try {
		ab.buildAuthenticated(token).authorize()
	} catch {
		// Timeout is expected on cold WASM — JIT is still warmed up
	}
})

describe("mint and verify", () => {
	it("mints a token with raw Datalog and verifies signature", () => {
		const { privateKey, publicKey } = setup()

		const builder = Biscuit.builder()
		builder.addCode(
			'user("alice"); check if time($t), $t <= 2099-01-01T00:00:00Z;',
		)
		const token = builder.build(privateKey)

		const ab = new AuthorizerBuilder()
		const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z")
		ab.addCode(`time(${now}); allow if true;`)
		const auth = ab.buildAuthenticated(token)
		expect(() => auth.authorize()).not.toThrow()
	})

	it("rejects token with wrong public key", () => {
		const { privateKey } = setup()
		const { publicKey: otherKey } = setup()

		const builder = Biscuit.builder()
		builder.addCode('user("alice");')
		const token = builder.build(privateKey)
		const b64 = token.toBase64()

		expect(() => Biscuit.fromBase64(b64, otherKey)).toThrow()
	})
})

describe("checks and ambient facts", () => {
	it("passes when check matches ambient fact", () => {
		const { privateKey, publicKey } = setup()

		const builder = Biscuit.builder()
		builder.addCode(
			'user("alice"); check if namespace($ns), ["my-app"].contains($ns);',
		)
		const token = builder.build(privateKey)

		const ab = new AuthorizerBuilder()
		ab.addCode('namespace("my-app"); allow if true;')
		const auth = ab.buildAuthenticated(token)
		expect(() => auth.authorize()).not.toThrow()
	})

	it("fails when check does not match ambient fact", () => {
		const { privateKey, publicKey } = setup()

		const builder = Biscuit.builder()
		builder.addCode(
			'user("alice"); check if namespace($ns), ["my-app"].contains($ns);',
		)
		const token = builder.build(privateKey)

		const ab = new AuthorizerBuilder()
		ab.addCode('namespace("other-app"); allow if true;')
		const auth = ab.buildAuthenticated(token)
		expect(() => auth.authorize()).toThrow()
	})

	it("root token with no checks passes any ambient facts", () => {
		const { privateKey, publicKey } = setup()

		const builder = Biscuit.builder()
		builder.addCode('user("alice");')
		const token = builder.build(privateKey)

		const ab = new AuthorizerBuilder()
		ab.addCode(
			'namespace("anything"); resource_type("connections"); operation("write"); allow if true;',
		)
		const auth = ab.buildAuthenticated(token)
		expect(() => auth.authorize()).not.toThrow()
	})
})

describe("attenuation", () => {
	it("restricts via appended block", () => {
		const { privateKey, publicKey } = setup()

		const builder = Biscuit.builder()
		builder.addCode('user("alice");')
		const token = builder.build(privateKey)

		const blk = Biscuit.block_builder()
		blk.addCode('check if operation($op), ["read"].contains($op);')
		const restricted = token.appendBlock(blk)

		// Read passes
		const ab1 = new AuthorizerBuilder()
		ab1.addCode('operation("read"); allow if true;')
		expect(() => ab1.buildAuthenticated(restricted).authorize()).not.toThrow()

		// Write fails
		const ab2 = new AuthorizerBuilder()
		ab2.addCode('operation("write"); allow if true;')
		expect(() => ab2.buildAuthenticated(restricted).authorize()).toThrow()
	})

	it("attenuation can only narrow, never widen", () => {
		const { privateKey, publicKey } = setup()

		const builder = Biscuit.builder()
		builder.addCode('user("alice");')
		const token = builder.build(privateKey)

		// First restriction: read only
		const blk1 = Biscuit.block_builder()
		blk1.addCode('check if operation($op), ["read"].contains($op);')
		const restricted1 = token.appendBlock(blk1)

		// Second restriction: tries to add write — but first block still blocks it
		const blk2 = Biscuit.block_builder()
		blk2.addCode('check if operation($op), ["read", "write"].contains($op);')
		const restricted2 = restricted1.appendBlock(blk2)

		const ab = new AuthorizerBuilder()
		ab.addCode('operation("write"); allow if true;')
		expect(() => ab.buildAuthenticated(restricted2).authorize()).toThrow()
	})

	it("counts blocks correctly", () => {
		const { privateKey, publicKey } = setup()

		const builder = Biscuit.builder()
		builder.addCode('user("alice");')
		const token = builder.build(privateKey)
		expect(token.countBlocks()).toBe(1)

		const blk = Biscuit.block_builder()
		blk.addCode('check if operation($op), ["read"].contains($op);')
		const restricted = token.appendBlock(blk)
		expect(restricted.countBlocks()).toBe(2)
	})
})

describe("serialization", () => {
	it("round-trips through base64", () => {
		const { privateKey, publicKey } = setup()

		const builder = Biscuit.builder()
		builder.addCode('user("alice");')
		const token = builder.build(privateKey)
		const b64 = token.toBase64()

		const restored = Biscuit.fromBase64(b64, publicKey)
		expect(restored.toBase64()).toBe(b64)
	})
})

describe("key generation", () => {
	it("generates unique key pairs", () => {
		const kp1 = new KeyPair("Ed25519")
		const kp2 = new KeyPair("Ed25519")
		expect(kp1.getPrivateKey().toString()).not.toBe(
			kp2.getPrivateKey().toString(),
		)
	})
})
