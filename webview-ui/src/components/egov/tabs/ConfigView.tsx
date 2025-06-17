import { useState, useEffect, useRef } from "react"
import {
	VSCodeButton,
	VSCodeDropdown,
	VSCodeOption,
	VSCodeTextField,
} from "@vscode/webview-ui-toolkit/react"

const ConfigView = () => {
	const [selectedCategory, setSelectedCategory] = useState<string>("")
	const [selectedConfig, setSelectedConfig] = useState<string>("")
	const [outputPath, setOutputPath] = useState<string>("")
	const [isGenerating, setIsGenerating] = useState<boolean>(false)
	const [generationStatus, setGenerationStatus] = useState<string>("")

	// VS Code API를 한 번만 획득하도록 useRef 사용
	const vsCodeRef = useRef<any>(null)
	
	if (!vsCodeRef.current) {
		try {
			vsCodeRef.current = (window as any).acquireVsCodeApi()
			console.log('✅ ConfigView: VS Code API acquired successfully')
		} catch (error) {
			console.error('❌ ConfigView: Failed to acquire VS Code API:', error)
		}
	}

	const configCategories = [
		"DataSource",
		"Transaction", 
		"Logging",
		"Scheduling",
		"Cache",
		"Property",
		"ID Generation"
	]

	useEffect(() => {
		console.log('🔧 ConfigView: useEffect running...')
		
		if (vsCodeRef.current) {
			// 현재 작업공간 경로 요청
			vsCodeRef.current.postMessage({ command: "getWorkspacePath" })
		}

		// 메시지 리스너
		const handleMessage = (event: MessageEvent) => {
			const message = event.data
			console.log('📨 ConfigView received message:', message.command)
			
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
				case "configGenerationResult":
					setIsGenerating(false)
					if (message.success) {
						setGenerationStatus(`✅ Configuration generated successfully`)
					} else {
						setGenerationStatus(`❌ Generation failed: ${message.error}`)
					}
					break
			}
		}

		window.addEventListener("message", handleMessage)
		return () => {
			console.log('🧹 ConfigView: Cleaning up message listener')
			window.removeEventListener("message", handleMessage)
		}
	}, [])

	const handleSelectOutputPath = () => {
		if (vsCodeRef.current) {
			vsCodeRef.current.postMessage({ command: "selectOutputPath" })
		}
	}

	const handleGenerateConfig = async () => {
		if (!selectedCategory || !selectedConfig) {
			setGenerationStatus("❌ Please select category and configuration type")
			return
		}

		setIsGenerating(true)
		setGenerationStatus("🚀 Starting configuration generation...")

		try {
			if (vsCodeRef.current) {
				vsCodeRef.current.postMessage({
					command: "generateConfig",
					category: selectedCategory,
					configType: selectedConfig,
					outputPath
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
				⚙️ Generate Configurations
			</h4>
			<p style={{ 
				fontSize: "10px", 
				color: "var(--vscode-descriptionForeground)", 
				margin: 0, 
				lineHeight: "1.3"
			}}>
				Generate configuration files
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
				<label style={{ 
					display: "block", 
					marginBottom: "3px", 
					color: "var(--vscode-foreground)",
					fontSize: "10px",
					fontWeight: "500"
				}}>
					Category
				</label>
				<VSCodeDropdown
					value={selectedCategory}
					onInput={(e: any) => setSelectedCategory(e.target.value)}
					style={{ width: "100%", fontSize: "10px" }}>
					<VSCodeOption value="">-- Select Category --</VSCodeOption>
					{configCategories.map((category) => (
						<VSCodeOption key={category} value={category}>
							{category}
						</VSCodeOption>
					))}
				</VSCodeDropdown>
			</div>

			<div style={{ marginBottom: "12px" }}>
				<label style={{ 
					display: "block", 
					marginBottom: "3px", 
					color: "var(--vscode-foreground)",
					fontSize: "10px",
					fontWeight: "500"
				}}>
					Configuration Type
				</label>
				<VSCodeDropdown
					value={selectedConfig}
					onInput={(e: any) => setSelectedConfig(e.target.value)}
					style={{ width: "100%", fontSize: "10px" }}
					disabled={!selectedCategory}>
					<VSCodeOption value="">-- Select Configuration --</VSCodeOption>
					{selectedCategory === "DataSource" && (
						<>
							<VSCodeOption value="datasource">DataSource</VSCodeOption>
							<VSCodeOption value="jndi">JNDI DataSource</VSCodeOption>
						</>
					)}
					{selectedCategory === "Transaction" && (
						<>
							<VSCodeOption value="datasource">DataSource Transaction</VSCodeOption>
							<VSCodeOption value="jpa">JPA Transaction</VSCodeOption>
							<VSCodeOption value="jta">JTA Transaction</VSCodeOption>
						</>
					)}
					{selectedCategory === "Logging" && (
						<>
							<VSCodeOption value="console">Console Logging</VSCodeOption>
							<VSCodeOption value="file">File Logging</VSCodeOption>
							<VSCodeOption value="jdbc">JDBC Logging</VSCodeOption>
						</>
					)}
					{selectedCategory === "Scheduling" && (
						<>
							<VSCodeOption value="quartz">Quartz Scheduler</VSCodeOption>
							<VSCodeOption value="taskExecutor">Task Executor</VSCodeOption>
						</>
					)}
					{selectedCategory === "Cache" && (
						<>
							<VSCodeOption value="ehcache">EHCache</VSCodeOption>
							<VSCodeOption value="redis">Redis Cache</VSCodeOption>
						</>
					)}
					{selectedCategory === "Property" && (
						<>
							<VSCodeOption value="properties">Properties</VSCodeOption>
							<VSCodeOption value="yaml">YAML</VSCodeOption>
						</>
					)}
					{selectedCategory === "ID Generation" && (
						<>
							<VSCodeOption value="sequence">Sequence ID</VSCodeOption>
							<VSCodeOption value="uuid">UUID</VSCodeOption>
							<VSCodeOption value="table">Table ID</VSCodeOption>
						</>
					)}
				</VSCodeDropdown>
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
				onClick={handleGenerateConfig}
				disabled={isGenerating || !selectedCategory || !selectedConfig}
				style={{ 
					width: "100%",
					fontSize: "10px",
					padding: "6px"
				}}>
				{isGenerating ? "Generating..." : "Generate Configuration"}
			</VSCodeButton>
		</div>
	)
}

export default ConfigView 