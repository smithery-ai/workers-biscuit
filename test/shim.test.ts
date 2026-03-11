import { describe, expect, it } from "vitest"

describe("shim startup logging", () => {
	it("suppresses only the biscuit-wasm init log", async () => {
		const calls: unknown[][] = []
		const originalLog = console.log

		console.log = (...args: unknown[]) => {
			calls.push(args)
		}

		try {
			await import("../src/shim-node.ts")
			console.log("user log after import")
		} finally {
			console.log = originalLog
		}

		expect(calls).not.toContainEqual(["biscuit-wasm loading"])
		expect(calls).toContainEqual(["user log after import"])
	})
})
