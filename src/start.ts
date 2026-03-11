const BISCUIT_WASM_INIT_LOG = "biscuit-wasm loading"

export function runWasmStart(start: () => void) {
	const originalLog = console.log

	console.log = (...args: any[]) => {
		if (args.length === 1 && args[0] === BISCUIT_WASM_INIT_LOG) {
			return
		}

		originalLog.apply(console, args)
	}

	try {
		start()
	} finally {
		console.log = originalLog
	}
}
