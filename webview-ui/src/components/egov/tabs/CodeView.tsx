import { VSCodeButton, VSCodeTextArea, VSCodeLink, VSCodeProgressRing, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { useState, useEffect } from "react"

// VSCode API 타입 정의
declare global {
	function acquireVsCodeApi(): {
		postMessage: (message: any) => void
		getState: () => any
		setState: (state: any) => void
	}
}

interface ParsedDDL {
	tableName: string
	attributes: Array<{
		columnName: string
		dataType: string
		ccName: string
		javaType: string
		isPrimaryKey: boolean
	}>
	pkAttributes: Array<{
		columnName: string
		ccName: string
		javaType: string
	}>
}

// VS Code API 래퍼
const vscode = (() => {
	try {
		return acquireVsCodeApi()
	} catch (err) {
		console.error("Failed to acquire vscode API:", err)
		return {
			postMessage: (message: any) => console.log("Mock vscode message:", message),
			getState: () => ({}),
			setState: (state: any) => console.log("Mock vscode setState:", state)
		}
	}
})()

// DDL 파싱 함수
const parseDDL = (ddl: string): ParsedDDL => {
	const lines = ddl.trim().split('\n')
	let tableName = ''
	const attributes: any[] = []
	const pkAttributes: any[] = []

	for (const line of lines) {
		const trimmedLine = line.trim()
		
		// Extract table name
		if (trimmedLine.toUpperCase().includes('CREATE TABLE')) {
			const match = trimmedLine.match(/CREATE TABLE\s+(\w+)/i)
			if (match) {
				tableName = match[1].toLowerCase()
			}
		}

		// Extract column definitions
		if (trimmedLine.includes('(') || (trimmedLine.includes(' ') && !trimmedLine.startsWith('--'))) {
			const columnMatch = trimmedLine.match(/(\w+)\s+(\w+)(\([^)]*\))?\s*(.*)/i)
			if (columnMatch) {
				const columnName = columnMatch[1].toLowerCase()
				const dataType = columnMatch[2].toUpperCase()
				const ccName = toCamelCase(columnName)
				const javaType = mapSqlToJavaType(dataType)
				const isPrimaryKey = trimmedLine.toUpperCase().includes('PRIMARY KEY')

				attributes.push({
					columnName,
					dataType,
					ccName,
					javaType,
					isPrimaryKey
				})

				if (isPrimaryKey) {
					pkAttributes.push({
						columnName,
						ccName,
						javaType
					})
				}
			}
		}
	}

	return { tableName, attributes, pkAttributes }
}

// DDL 유효성 검사
const validateDDL = (ddl: string): boolean => {
	const trimmed = ddl.trim().toLowerCase()
	return trimmed.includes('create table') && trimmed.includes('(')
}

// 샘플 DDL 생성
const generateSampleDDL = (): string => {
	return `CREATE TABLE board (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    author VARCHAR(100) NOT NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`
}

// Camel Case 변환
const toCamelCase = (str: string): string => {
	return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase())
}

// SQL to Java 타입 매핑
const mapSqlToJavaType = (sqlType: string): string => {
	const type = sqlType.toUpperCase()
	if (type.includes('VARCHAR') || type.includes('TEXT') || type.includes('CHAR')) return 'String'
	if (type.includes('INT') || type.includes('BIGINT')) return 'Long'
	if (type.includes('DECIMAL') || type.includes('NUMERIC')) return 'BigDecimal'
	if (type.includes('DATE') || type.includes('TIMESTAMP')) return 'Date'
	if (type.includes('BOOLEAN')) return 'Boolean'
	return 'String'
}

// 템플릿 컨텍스트 생성
const getTemplateContext = (tableName: string, attributes: any[], pkAttributes: any[]) => {
	return {
		tableName,
		tableNameCamelCase: toCamelCase(tableName),
		tableNamePascalCase: toCamelCase(tableName).charAt(0).toUpperCase() + toCamelCase(tableName).slice(1),
		attributes,
		pkAttributes,
		hasCompositeKey: pkAttributes.length > 1
	}
}

const createSelectOutputPathMessage = () => ({
	type: "selectOutputPath"
})

const CodeView = () => {
	console.log("CodeView component rendering...")

	const [ddlContent, setDdlContent] = useState("")
	const [parsedDDL, setParsedDDL] = useState<ParsedDDL | null>(null)
	const [isValid, setIsValid] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState("")
	const [outputPath, setOutputPath] = useState<string>("")
	const [packageName, setPackageName] = useState<string>("com.example.project")

	// DDL 유효성 검사 및 파싱
	useEffect(() => {
		console.log("DDL validation effect running...", ddlContent.length)

		if (!ddlContent.trim()) {
			setIsValid(false)
			setParsedDDL(null)
			setError("")
			return
		}

		try {
			const isValidDDL = validateDDL(ddlContent)
			setIsValid(isValidDDL)

			if (isValidDDL) {
				const parsed = parseDDL(ddlContent)
				setParsedDDL(parsed)
				setError("")
			} else {
				setParsedDDL(null)
				setError("Invalid DDL format")
			}
		} catch (err) {
			console.error("DDL parsing error:", err)
			setIsValid(false)
			setParsedDDL(null)
			setError(err instanceof Error ? err.message : "Parsing error")
		}
	}, [ddlContent])

	// VSCode 익스텐션으로부터 메시지 수신
	useEffect(() => {
		console.log("Setting up message listener...")

		// Request current workspace path when component mounts
		try {
			vscode.postMessage({ type: "getWorkspacePath" })
		} catch (err) {
			console.error("Error sending getWorkspacePath message:", err)
		}

		const handleMessage = (event: MessageEvent) => {
			const message = event.data
			console.log("Received message from extension:", message)
			setIsLoading(false)

			if (message && typeof message === "object" && "type" in message) {
				switch (message.type) {
					case "error":
						console.error("Extension error:", message.message)
						setError(message.message || "Unknown error occurred")
						break
					case "success":
						console.log("Extension success:", message.message)
						setError("")
						break
					case "sampleDDL":
						setDdlContent(message.ddl || "")
						break
					case "selectedOutputPath":
						if (message.text) {
							setOutputPath(message.text)
						}
						break
					case "currentWorkspacePath":
						if (message.text) {
							setOutputPath(message.text)
						}
						break
					default:
						console.log("Unhandled message type:", message.type)
				}
			}
		}

		window.addEventListener("message", handleMessage)
		return () => {
			console.log("Cleaning up message listener...")
			window.removeEventListener("message", handleMessage)
		}
	}, [])

	const handleGenerateCode = () => {
		console.log("Generate code clicked")
		if (!isValid || !ddlContent.trim()) return

		// Validate required fields
		if (!packageName.trim()) {
			setError("Package name is required")
			return
		}
		if (!outputPath.trim()) {
			setError("Output path is required")
			return
		}

		setIsLoading(true)
		setError("")
		try {
			vscode.postMessage({
				type: "generateCode",
				ddl: ddlContent,
				packageName: packageName.trim(),
				outputPath: outputPath.trim(),
			})
		} catch (err) {
			console.error("Error sending generateCode message:", err)
			setError("Failed to send message to extension")
			setIsLoading(false)
		}
	}

	const handleUploadTemplates = () => {
		console.log("Upload templates clicked")
		if (!isValid || !ddlContent.trim()) return

		setIsLoading(true)
		setError("")
		try {
			vscode.postMessage({
				type: "uploadTemplates",
				ddl: ddlContent,
			})
		} catch (err) {
			console.error("Error sending uploadTemplates message:", err)
			setError("Failed to send message to extension")
			setIsLoading(false)
		}
	}

	const handleDownloadTemplateContext = () => {
		console.log("Download template context clicked")
		if (!isValid || !parsedDDL) return

		try {
			const context = getTemplateContext(parsedDDL.tableName, parsedDDL.attributes, parsedDDL.pkAttributes)

			setIsLoading(true)
			setError("")
			vscode.postMessage({
				type: "downloadTemplateContext",
				ddl: ddlContent,
				context,
			})
		} catch (err) {
			console.error("Error in downloadTemplateContext:", err)
			setError(err instanceof Error ? err.message : "Context generation error")
		}
	}

	const handleInsertSampleDDL = () => {
		console.log("Insert sample DDL clicked")
		try {
			const sampleDDL = generateSampleDDL()
			setDdlContent(sampleDDL)
		} catch (err) {
			console.error("Error generating sample DDL:", err)
			setError("Failed to generate sample DDL")
		}
	}

	const handleSelectOutputPath = () => {
		console.log("Select output path clicked")
		console.log("vscode object:", typeof vscode, vscode)

		try {
			if (typeof vscode === "undefined") {
				console.error("vscode object is undefined")
				setError("VSCode API not available")
				return
			}

			if (typeof vscode.postMessage !== "function") {
				console.error("vscode.postMessage is not a function")
				setError("VSCode postMessage not available")
				return
			}

			const message = createSelectOutputPathMessage()
			console.log("Sending message:", message)
			vscode.postMessage(message)
		} catch (err) {
			console.error("Error sending selectOutputPath message:", err)
			setError(`Failed to send message to extension: ${err instanceof Error ? err.message : String(err)}`)
		}
	}

	console.log("CodeView rendering with state:", {
		ddlContentLength: ddlContent.length,
		isValid,
		parsedDDL: !!parsedDDL,
		error,
		outputPath,
		packageName,
	})

	try {
		return (
			<div style={{ padding: "16px 20px" }}>
				<div
					style={{
						color: "var(--vscode-foreground)",
						fontSize: "13px",
						marginBottom: "16px",
						marginTop: "5px",
					}}>
					<h3 style={{ color: "var(--vscode-foreground)", marginTop: 0, marginBottom: "8px" }}>
						Generate eGovFrame Code from DDL
					</h3>
					<p
						style={{
							fontSize: "12px",
							color: "var(--vscode-descriptionForeground)",
							margin: 0,
							marginTop: "5px",
						}}>
						Generate CRUD operations and database-related code from DDL (Data Definition Language) statements.
						Supports Oracle, MySQL, PostgreSQL and more. Uses Handlebars template engine. Learn more at{" "}
						<VSCodeLink href="https://github.com/chris-yoon/egovframe-pack" style={{ display: "inline" }}>
							GitHub
						</VSCodeLink>
					</p>
				</div>

				{/* Toolbar */}
				<div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
					<VSCodeButton appearance="secondary" onClick={handleInsertSampleDDL}>
						<span className="codicon codicon-code" style={{ marginRight: "6px" }}></span>
						Insert Sample DDL
					</VSCodeButton>
				</div>

				{/* DDL Input Section */}
				<div style={{ marginBottom: "20px" }}>
					<h4 style={{ color: "var(--vscode-foreground)", marginBottom: "10px", marginTop: 0 }}>
						DDL Input
						{ddlContent.trim() && (
							<span
								style={{
									marginLeft: "10px",
									fontSize: "12px",
									color: isValid ? "var(--vscode-terminal-ansiGreen)" : "var(--vscode-errorForeground)",
								}}>
								{isValid ? "✓ Valid" : "✗ Invalid"}
							</span>
						)}
					</h4>
					<VSCodeTextArea
						rows={15}
						style={{
							width: "100%",
							fontFamily: "monospace",
							borderColor: error ? "var(--vscode-errorBorder)" : undefined,
						}}
						placeholder="Enter your DDL statements here..."
						value={ddlContent}
						onInput={(e: any) => setDdlContent(e.target.value)}
					/>
					{error && (
						<div
							style={{
								color: "var(--vscode-errorForeground)",
								fontSize: "12px",
								marginTop: "5px",
							}}>
							{error}
						</div>
					)}
				</div>

				{/* Parsed DDL Preview */}
				{parsedDDL && (
					<div style={{ marginBottom: "20px" }}>
						<h4 style={{ color: "var(--vscode-foreground)", marginBottom: "10px" }}>
							Parsed Table: {parsedDDL.tableName}
						</h4>
						<div
							style={{
								backgroundColor: "var(--vscode-editor-inactiveSelectionBackground)",
								padding: "10px",
								borderRadius: "4px",
								fontSize: "12px",
							}}>
							<div style={{ marginBottom: "8px" }}>
								<strong>Columns ({parsedDDL.attributes.length}):</strong>
							</div>
							{parsedDDL.attributes.map((col, index) => (
								<div key={index} style={{ marginLeft: "10px", marginBottom: "2px" }}>
									{col.columnName} ({col.dataType}) → {col.ccName} ({col.javaType})
									{col.isPrimaryKey && (
										<span style={{ color: "var(--vscode-terminal-ansiYellow)" }}> [PK]</span>
									)}
								</div>
							))}
						</div>
					</div>
				)}

				{/* Configuration Section */}
				{isValid && parsedDDL && (
					<div style={{ marginBottom: "20px" }}>
						<h4 style={{ color: "var(--vscode-foreground)", marginBottom: "10px" }}>Configuration</h4>

						{/* Package Name */}
						<div style={{ marginBottom: "15px" }}>
							<label style={{ display: "block", marginBottom: "5px", fontSize: "12px" }}>Package Name *</label>
							<VSCodeTextField
								value={packageName}
								placeholder="e.g., com.example.project"
								style={{ width: "100%" }}
								onInput={(e: any) => setPackageName(e.target.value)}
							/>
							<div style={{ fontSize: "10px", color: "var(--vscode-descriptionForeground)", marginTop: "2px" }}>
								Java package naming convention (e.g., com.company.project)
							</div>
						</div>

						{/* Output Path */}
						<div style={{ marginBottom: "15px" }}>
							<label style={{ display: "block", marginBottom: "5px", fontSize: "12px" }}>Output Path *</label>
							<div style={{ display: "flex", gap: "10px" }}>
								<VSCodeTextField
									value={outputPath}
									placeholder="Select output directory"
									style={{ flex: 1 }}
									onInput={(e: any) => setOutputPath(e.target.value)}
								/>
								<VSCodeButton appearance="secondary" onClick={handleSelectOutputPath}>
									<span className="codicon codicon-folder-opened" style={{ marginRight: "6px" }}></span>
									Browse
								</VSCodeButton>
							</div>
							<div style={{ fontSize: "10px", color: "var(--vscode-descriptionForeground)", marginTop: "2px" }}>
								Generated files will be saved to: {outputPath || "Not selected"}
							</div>
						</div>
					</div>
				)}

				{/* Generation Options */}
				<div style={{ marginBottom: "20px" }}>
					<h4 style={{ color: "var(--vscode-foreground)", marginBottom: "10px" }}>Code Generation</h4>

					<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
						<VSCodeButton
							appearance="primary"
							style={{ width: "100%" }}
							onClick={handleGenerateCode}
							disabled={!isValid || isLoading || !packageName.trim() || !outputPath.trim()}>
							{isLoading ? (
								<>
									<VSCodeProgressRing style={{ marginRight: "8px", width: "16px", height: "16px" }} />
									Generating...
								</>
							) : (
								<>
									<span className="codicon codicon-gear" style={{ marginRight: "6px" }}></span>
									Generate CRUD Code
								</>
							)}
						</VSCodeButton>

						<VSCodeButton
							appearance="secondary"
							style={{ width: "100%" }}
							onClick={handleUploadTemplates}
							disabled={!isValid || isLoading}>
							<span className="codicon codicon-file-code" style={{ marginRight: "6px" }}></span>
							Generate with Custom Templates
						</VSCodeButton>

						<VSCodeButton
							appearance="secondary"
							style={{ width: "100%" }}
							onClick={handleDownloadTemplateContext}
							disabled={!isValid || isLoading}>
							<span className="codicon codicon-json" style={{ marginRight: "6px" }}></span>
							Download Template Context
						</VSCodeButton>
					</div>

					<div style={{ fontSize: "12px", color: "var(--vscode-descriptionForeground)", marginTop: "10px" }}>
						<div>
							• <strong>Generate CRUD Code:</strong> Creates complete DAO, Service, Controller, and JSP files
						</div>
						<div>
							• <strong>Custom Templates:</strong> Upload your own Handlebars templates for code generation
						</div>
						<div>
							• <strong>Template Context:</strong> Download JSON context for creating custom templates
						</div>
					</div>
				</div>

				{/* Generated Code Types */}
				<div
					style={{
						backgroundColor: "var(--vscode-editor-inactiveSelectionBackground)",
						padding: "15px",
						borderRadius: "4px",
						marginTop: "20px",
					}}>
					<h4 style={{ color: "var(--vscode-foreground)", marginBottom: "10px", marginTop: 0 }}>
						Generated Code Includes
					</h4>

					{/* Java Files */}
					<div style={{ marginBottom: "12px" }}>
						<strong style={{ fontSize: "13px", color: "var(--vscode-foreground)" }}>Java Files:</strong>
						<ul
							style={{
								fontSize: "12px",
								color: "var(--vscode-foreground)",
								margin: "5px 0 0 0",
								paddingLeft: "20px",
							}}>
							<li>
								<strong>VO (Value Object):</strong> {parsedDDL?.tableName || "Table"}VO.java, DefaultVO.java
							</li>
							<li>
								<strong>Service Layer:</strong> {parsedDDL?.tableName || "Table"}Service.java,{" "}
								{parsedDDL?.tableName || "Table"}ServiceImpl.java
							</li>
							<li>
								<strong>Controller:</strong> {parsedDDL?.tableName || "Table"}Controller.java
							</li>
							<li>
								<strong>DAO:</strong> {parsedDDL?.tableName || "Table"}DAO.java
							</li>
						</ul>
					</div>

					{/* SQL Files */}
					<div style={{ marginBottom: "12px" }}>
						<strong style={{ fontSize: "13px", color: "var(--vscode-foreground)" }}>SQL Files:</strong>
						<ul
							style={{
								fontSize: "12px",
								color: "var(--vscode-foreground)",
								margin: "5px 0 0 0",
								paddingLeft: "20px",
							}}>
							<li>
								<strong>SQL Mapper:</strong> {parsedDDL?.tableName || "Table"}_SQL_*.xml (Oracle, MySQL, PostgreSQL)
							</li>
						</ul>
					</div>

					{/* JSP Files */}
					<div>
						<strong style={{ fontSize: "13px", color: "var(--vscode-foreground)" }}>JSP Views:</strong>
						<ul
							style={{
								fontSize: "12px",
								color: "var(--vscode-foreground)",
								margin: "5px 0 0 0",
								paddingLeft: "20px",
							}}>
							<li>
								<strong>List View:</strong> {parsedDDL?.tableName || "table"}List.jsp (with pagination)
							</li>
							<li>
								<strong>Detail View:</strong> {parsedDDL?.tableName || "table"}Detail.jsp
							</li>
							<li>
								<strong>Register View:</strong> {parsedDDL?.tableName || "table"}Register.jsp
							</li>
							<li>
								<strong>Modify View:</strong> {parsedDDL?.tableName || "table"}Modify.jsp
							</li>
						</ul>
					</div>
				</div>
			</div>
		)
	} catch (renderError) {
		console.error("Error rendering CodeView:", renderError)
		return (
			<div style={{ padding: "20px", color: "var(--vscode-errorForeground)" }}>
				<h3>Error Rendering CodeView</h3>
				<p>An error occurred while rendering the component. Please check the console for details.</p>
				<pre style={{ fontSize: "12px", backgroundColor: "var(--vscode-textCodeBlock-background)", padding: "10px" }}>
					{renderError instanceof Error ? renderError.message : String(renderError)}
				</pre>
			</div>
		)
	}
}

export default CodeView 