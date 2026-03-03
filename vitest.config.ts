import wasm from "vite-plugin-wasm"
import { defineConfig } from "vitest/config"

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
