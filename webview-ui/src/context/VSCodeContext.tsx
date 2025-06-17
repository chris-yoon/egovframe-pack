import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

// VSCode API 타입 정의
interface VSCodeAPI {
	postMessage: (message: any) => void
	getState: () => any
	setState: (state: any) => void
}

// Context 타입 정의
interface VSCodeContextType {
	vscode: VSCodeAPI | null
	isReady: boolean
	error: string | null
}

// VSCode API 전역 선언
declare global {
	function acquireVsCodeApi(): VSCodeAPI
}

// Context 생성
const VSCodeContext = createContext<VSCodeContextType>({
	vscode: null,
	isReady: false,
	error: null
})

// Hook for using VSCode context
export const useVSCode = () => {
	const context = useContext(VSCodeContext)
	if (!context) {
		throw new Error('useVSCode must be used within a VSCodeProvider')
	}
	return context
}

// Provider Props
interface VSCodeProviderProps {
	children: ReactNode
}

// 전역 VSCode API 인스턴스 (모듈 레벨에서 관리)
let globalVSCodeAPI: VSCodeAPI | null = null
let isInitializing = false

// 모듈 로딩 시점에 즉시 API 획득 시도
const tryAcquireVSCodeAPIImmediately = () => {
	if (globalVSCodeAPI || isInitializing) return globalVSCodeAPI

	console.log("🔥 IMMEDIATE: Attempting to acquire VSCode API at module load time...")
	console.log("🔥 IMMEDIATE: acquireVsCodeApi type:", typeof acquireVsCodeApi)
	
	// VSCode 환경인지 확인
	const isVSCodeWebview = typeof acquireVsCodeApi !== 'undefined' && 
	                       (window.location.protocol === 'vscode-webview:' || 
	                        navigator.userAgent.includes('vscode'))
	
	console.log("🔥 IMMEDIATE: Is VSCode webview environment:", isVSCodeWebview)
	
	if (!isVSCodeWebview) {
		console.warn("🔥 IMMEDIATE: Not in VSCode webview environment")
		return null
	}
	
	try {
		isInitializing = true
		const api = acquireVsCodeApi()
		console.log("🔥 IMMEDIATE: VSCode API acquired successfully at module load!")
		globalVSCodeAPI = api
		isInitializing = false
		return api
	} catch (err) {
		console.error("🔥 IMMEDIATE: Failed to acquire VSCode API at module load:", err)
		isInitializing = false
		return null
	}
}

// 즉시 실행
tryAcquireVSCodeAPIImmediately()

// VSCode Provider 컴포넌트
export const VSCodeProvider: React.FC<VSCodeProviderProps> = ({ children }) => {
	const [vscode, setVscode] = useState<VSCodeAPI | null>(null)
	const [isReady, setIsReady] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// 즉시 초기화 (useEffect 외부에서)
	const initializeVSCodeAPI = () => {
		if (globalVSCodeAPI) {
			console.log("🔄 VSCodeProvider: Using existing global API instance")
			setVscode(globalVSCodeAPI)
			setIsReady(true)
			return
		}

		if (isInitializing) {
			console.log("⏳ VSCodeProvider: Already initializing, waiting...")
			return
		}

		isInitializing = true
		console.log("🚀 VSCodeProvider: Initializing VSCode API...")
		console.log("🔍 VSCodeProvider: acquireVsCodeApi type:", typeof acquireVsCodeApi)
		console.log("🔍 VSCodeProvider: User agent:", navigator.userAgent)
		console.log("🔍 VSCodeProvider: Location:", window.location.href)
		
		// VSCode 환경인지 확인
		const isVSCodeWebview = typeof acquireVsCodeApi !== 'undefined' && 
		                       (window.location.protocol === 'vscode-webview:' || 
		                        navigator.userAgent.includes('vscode'))
		
		console.log("🔍 VSCodeProvider: Is VSCode webview environment:", isVSCodeWebview)
		
		if (!isVSCodeWebview) {
			console.warn("⚠️ VSCodeProvider: Not in VSCode webview environment, using mock API")
			const mockAPI: VSCodeAPI = {
				postMessage: (message: any) => {
					console.log("📤 VSCodeProvider Mock postMessage:", message)
					// 브라우저 환경에서 테스트할 때 간단한 응답 시뮬레이션
					if (message.type === 'getWorkspacePath') {
						setTimeout(() => {
							window.dispatchEvent(new CustomEvent('message', {
								detail: { data: { type: 'workspacePath', path: '/mock/workspace/path' } }
							}))
						}, 100)
					}
				},
				getState: () => ({}),
				setState: (state: any) => console.log("📝 VSCodeProvider Mock setState:", state)
			}
			globalVSCodeAPI = mockAPI
			setVscode(mockAPI)
			setIsReady(true)
			isInitializing = false
			return
		}
		
		try {
			const api = acquireVsCodeApi()
			console.log("✅ VSCodeProvider: VSCode API acquired successfully:", typeof api)
			
			// API 테스트
			if (typeof api.postMessage === 'function') {
				console.log("✅ VSCodeProvider: postMessage function available")
			} else {
				console.error("❌ VSCodeProvider: postMessage is not a function:", typeof api.postMessage)
			}
			
			globalVSCodeAPI = api
			setVscode(api)
			setIsReady(true)
			setError(null)
			isInitializing = false
		} catch (err) {
			console.error("❌ VSCodeProvider: Failed to acquire vscode API:", err)
			setError(err instanceof Error ? err.message : 'Unknown error')
			setIsReady(false)
			isInitializing = false
		}
	}

	useEffect(() => {
		initializeVSCodeAPI()
	}, [])

	const value: VSCodeContextType = {
		vscode,
		isReady,
		error
	}

	return (
		<VSCodeContext.Provider value={value}>
			{children}
		</VSCodeContext.Provider>
	)
}

export default VSCodeContext 