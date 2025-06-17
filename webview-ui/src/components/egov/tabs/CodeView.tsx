import { useState, useEffect, useRef } from "react"
import {
	VSCodeButton,
	VSCodeTextArea,
	VSCodeTextField,
	VSCodeLink,
} from "@vscode/webview-ui-toolkit/react"

const CodeView = () => {
	const [ddlInput, setDdlInput] = useState<string>("")
	const [outputPath, setOutputPath] = useState<string>("")
	const [packageName, setPackageName] = useState<string>("egovframework.example.sample")
	const [isGenerating, setIsGenerating] = useState<boolean>(false)
	const [generationStatus, setGenerationStatus] = useState<string>("")

	// VS Code API를 한 번만 획득하도록 useRef 사용
	const vsCodeRef = useRef<any>(null)
	
	if (!vsCodeRef.current) {
		try {
			vsCodeRef.current = (window as any).acquireVsCodeApi()
			console.log('✅ CodeView: VS Code API acquired successfully')
		} catch (error) {
			console.error('❌ CodeView: Failed to acquire VS Code API:', error)
		}
	}

	useEffect(() => {
		console.log('🔧 CodeView: useEffect running...')
		
		if (vsCodeRef.current) {
			// 현재 작업공간 경로 요청
			vsCodeRef.current.postMessage({ command: "getWorkspacePath" })
		}

		// 메시지 리스너
		const handleMessage = (event: MessageEvent) => {
			const message = event.data
			console.log('📨 CodeView received message:', message.command)
			
			switch (message.command) {
				case "selectedOutputPath":
					if (message.path) {
						setOutputPath(message.path)
					}
					break
				case "currentWorkspacePath":
					if (message.path) {
						setOutputPath(message.path)
					}
					break
				case "codeGenerationResult":
					setIsGenerating(false)
					if (message.success) {
						setGenerationStatus(`✅ Code generated successfully`)
					} else {
						setGenerationStatus(`❌ Generation failed: ${message.error}`)
					}
					break
			}
		}

		window.addEventListener("message", handleMessage)
		return () => {
			console.log('🧹 CodeView: Cleaning up message listener')
			window.removeEventListener("message", handleMessage)
		}
	}, [])

	const handleSelectOutputPath = () => {
		if (vsCodeRef.current) {
			vsCodeRef.current.postMessage({ command: "selectOutputPath" })
		}
	}

	const handleInsertSampleDDL = () => {
		const sampleDDL = `CREATE TABLE board (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    author VARCHAR(100) NOT NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`
		setDdlInput(sampleDDL)
	}

	const handleGenerateCode = async () => {
		if (!ddlInput.trim()) {
			setGenerationStatus("❌ Please enter DDL statement")
			return
		}

		setIsGenerating(true)
		setGenerationStatus("🚀 Starting code generation...")

		try {
			if (vsCodeRef.current) {
				vsCodeRef.current.postMessage({
					command: "generateCode",
					ddl: ddlInput,
					outputPath,
					packageName
				})
			}
		} catch (error) {
			setIsGenerating(false)
			setGenerationStatus(`❌ Error: ${error}`)
		}
	}

	return (
		<div style={{ padding: "8px", fontSize: "11px" }}>
			<h4 style={{ 
				color: "var(--vscode-foreground)", 
				marginTop: 0, 
				marginBottom: "4px",
				fontSize: "12px",
				fontWeight: "600"
			}}>
				💻 Generate Code from DDL
			</h4>
			<p style={{ 
				fontSize: "10px", 
				color: "var(--vscode-descriptionForeground)", 
				margin: 0, 
				lineHeight: "1.3"
			}}>
				Parse DDL and generate CRUD code
			</p>

			{generationStatus && (
				<div style={{ 
					padding: "6px", 
					marginBottom: "12px", 
					backgroundColor: "var(--vscode-notifications-background)",
					border: "1px solid var(--vscode-notifications-border)",
					borderRadius: "3px",
					fontSize: "10px"
				}}>
					{generationStatus}
				</div>
			)}

			<div style={{ marginBottom: "12px" }}>
				<div style={{ 
					display: "flex", 
					justifyContent: "space-between", 
					alignItems: "center", 
					marginBottom: "3px" 
				}}>
					<label style={{ 
						color: "var(--vscode-foreground)",
						fontSize: "10px",
						fontWeight: "500"
					}}>
						DDL Statement
					</label>
					<VSCodeButton 
						onClick={handleInsertSampleDDL} 
						appearance="secondary"
						style={{ fontSize: "8px", padding: "2px 4px" }}>
						Sample
					</VSCodeButton>
				</div>
				<VSCodeTextArea
					value={ddlInput}
					onInput={(e: any) => setDdlInput(e.target.value)}
					placeholder="Enter your DDL statement here..."
					rows={6}
					style={{ 
						width: "100%", 
						fontFamily: "monospace",
						fontSize: "9px"
					}}
				/>
			</div>

			<div style={{ marginBottom: "8px" }}>
				<label style={{ 
					display: "block", 
					marginBottom: "3px", 
					color: "var(--vscode-foreground)",
					fontSize: "10px",
					fontWeight: "500"
				}}>
					Package Name
				</label>
				<VSCodeTextField
					value={packageName}
					onInput={(e: any) => setPackageName(e.target.value)}
					placeholder="egovframework.example.sample"
					style={{ width: "100%", fontSize: "10px" }}
				/>
			</div>

			<div style={{ marginBottom: "8px" }}>
				<label style={{ 
					display: "block", 
					marginBottom: "3px", 
					color: "var(--vscode-foreground)",
					fontSize: "10px",
					fontWeight: "500"
				}}>
					Output Path
				</label>
				<div style={{ display: "flex", gap: "4px" }}>
					<VSCodeTextField
						value={outputPath}
						onInput={(e: any) => setOutputPath(e.target.value)}
						placeholder="Select directory"
						style={{ flex: 1, fontSize: "10px" }}
						readOnly
					/>
					<VSCodeButton 
						onClick={handleSelectOutputPath}
						style={{ fontSize: "9px", padding: "2px 6px" }}
					>
						Browse
					</VSCodeButton>
				</div>
			</div>

			<VSCodeButton 
				onClick={handleGenerateCode}
				disabled={isGenerating}
				style={{ 
					width: "100%",
					fontSize: "10px",
					padding: "6px"
				}}>
				{isGenerating ? "Generating..." : "Generate Code"}
			</VSCodeButton>
		</div>
	)
}

export default CodeView 