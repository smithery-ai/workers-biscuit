import { defineConfig } from "vitest/config"
import wasm from "vite-plugin-wasm"

export default defineConfig({
	plugins: [wasm()],
	test: {
		globals: true,
		environment: "node",
		server: {
			deps: {
				// Force vite to process the biscuit-wasm package (contains .wasm imports)
				inline: ["@biscuit-auth/biscuit-wasm"],
			},
		},
	},
})
