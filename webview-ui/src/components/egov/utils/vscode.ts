// VSCode API 타입 정의
declare global {
	function acquireVsCodeApi(): {
		postMessage: (message: any) => void
		getState: () => any
		setState: (state: any) => void
	}
}

// VS Code API 래퍼
export const vscode = (() => {
	try {
		return acquireVsCodeApi()
	} catch (err) {
		console.error("Failed to acquire vscode API:", err)
		return {
			postMessage: (message: any) => {
				console.error("❌ VSCode API not available - message not sent:", message.type)
			},
			getState: () => ({}),
			setState: (state: any) => {
				console.error("❌ VSCode API not available - state not set")
			}
		}
	}
})() 