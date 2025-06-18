import { VSCodeButton, VSCodeTextArea, VSCodeLink, VSCodeProgressRing, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { useState, useEffect } from "react"
import { useVSCode } from '../../../context/VSCodeContext'

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
				const isTable = trimmedLine.toUpperCase().includes('TABLE')

				if (isTable) {
					continue
				}

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
// 강력한 DDL 유효성 검사 함수들을 import
import { validateDDL as validateDDLStrict, generateSampleDDL as generateSampleDDLStrict, type DDLValidationResult } from '../../../utils/ddlUtils'

// 간단한 유효성 검사 (이전 버전 호환용)
const validateDDL = (ddl: string): boolean => {
	const validation = validateDDLStrict(ddl)
	return validation.isValid
}

// 상세한 유효성 검사 결과를 반환하는 함수
const validateDDLDetailed = (ddl: string): DDLValidationResult => {
	return validateDDLStrict(ddl)
}

// 샘플 DDL 생성 (deprecated - 새로운 generateSampleDDLStrict 사용)
// const generateSampleDDL = (): string => {
// 	return generateSampleDDLStrict()
// }

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

const CodeView = () => {
	console.log("CodeView component rendering...")

	const { vscode, isReady, error: vscodeError } = useVSCode()

	const [ddlContent, setDdlContent] = useState("")
	const [parsedDDL, setParsedDDL] = useState<ParsedDDL | null>(null)
	const [isValid, setIsValid] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState("")
	const [outputPath, setOutputPath] = useState<string>("")
	const [packageName, setPackageName] = useState<string>("com.example.project")

	// VSCode API 준비 상태 체크
	if (!isReady) {
		return (
			<div style={{ padding: "20px", textAlign: "center" }}>
				<div style={{ marginBottom: "20px" }}>
					<span className="codicon codicon-loading codicon-modifier-spin" style={{ marginRight: "8px" }}></span>
					Initializing CodeView...
				</div>
			</div>
		)
	}

	if (vscodeError) {
		return (
			<div style={{ padding: "20px", textAlign: "center" }}>
				<div style={{ color: "var(--vscode-errorForeground)", marginBottom: "20px" }}>
					<span className="codicon codicon-error" style={{ marginRight: "8px" }}></span>
					VSCode API Error: {vscodeError}
				</div>
			</div>
		)
	}

	// DDL 유효성 검사 및 파싱 (강화된 버전)
	useEffect(() => {
		console.log("DDL validation effect running...", ddlContent.length)

		if (!ddlContent.trim()) {
			setIsValid(false)
			setParsedDDL(null)
			setError("")
			return
		}

		try {
			// 상세한 유효성 검사 수행
			const validationResult = validateDDLDetailed(ddlContent)
			setIsValid(validationResult.isValid)

			if (validationResult.isValid) {
				const parsed = parseDDL(ddlContent)
				setParsedDDL(parsed)
				
				// 경고가 있으면 표시하되 오류는 아님
				if (validationResult.warnings.length > 0) {
					setError(`⚠️ Warnings: ${validationResult.warnings.join('; ')}`)
				} else {
					setError("")
				}
			} else {
				setParsedDDL(null)
				// 상세한 오류 메시지 표시
				const errorMessages = [
					...validationResult.errors,
					...validationResult.warnings
				]
				setError(`❌ DDL Validation Errors: ${errorMessages.join('; ')}`)
			}
		} catch (err) {
			console.error("DDL parsing error:", err)
			setIsValid(false)
			setParsedDDL(null)
			setError(`❌ Parsing Error: ${err instanceof Error ? err.message : "Unknown parsing error"}`)
		}
	}, [ddlContent])

	// VSCode 익스텐션으로부터 메시지 수신
	useEffect(() => {
		if (!vscode) return

		console.log("🔧 Setting up message listener...")

		// Request current workspace path when component mounts
		vscode.postMessage({ type: "getWorkspacePath" })

		// Listen for messages from extension
		const handleMessage = (event: MessageEvent) => {
			const message = event.data
			console.log("📨 CodeView received message:", message)

			switch (message.type) {
				case "error":
					console.error("❌ Extension error:", message.message)
					setError(message.message || "Unknown error occurred")
					setIsLoading(false)
					break
				case "success":
					console.log("✅ Extension success:", message.message)
					setError("")
					setIsLoading(false)
					break
				case "progress":
					console.log("⏳ Extension progress:", message.text)
					// Don't reset loading for progress messages
					break
				case "info":
					console.log("ℹ️ Extension info:", message.message)
					setIsLoading(false)
					break
				case "sampleDDL":
					setDdlContent(message.ddl || "")
					setIsLoading(false)
					break
				case "selectedOutputPath":
					console.log("📁 Received selectedOutputPath:", message)
					if (message.path || message.text) {
						setOutputPath(message.path || message.text)
					}
					setIsLoading(false)
					break
				case "currentWorkspacePath":
					console.log("🏠 Received currentWorkspacePath:", message)
					// Set workspace path as default output path
					if (message.path || message.text) {
						setOutputPath(message.path || message.text)
					}
					setIsLoading(false)
					break
				default:
					console.log("🤷 Unknown message type:", message.type)
					setIsLoading(false)
					break
			}
		}

		window.addEventListener("message", handleMessage)
		return () => window.removeEventListener("message", handleMessage)
	}, [vscode])

	const handleGenerateCode = () => {
		console.log("Generate code clicked")
		if (!isValid || !ddlContent.trim() || !vscode) return

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
				command: "generateCode", // type 대신 command 사용
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
		if (!isValid || !ddlContent.trim() || !vscode) return

		setIsLoading(true)
		setError("")
		try {
			vscode.postMessage({
				command: "uploadTemplates", // type 대신 command 사용
				ddl: ddlContent,
				packageName: packageName,
				outputPath: outputPath.trim(),
			})
		} catch (err) {
			console.error("Error sending uploadTemplates message:", err)
			setError("Failed to send message to extension")
			setIsLoading(false)
		}
	}

	const handleDownloadTemplateContext = () => {
		console.log("Download template context clicked")
		if (!isValid || !parsedDDL || !vscode) return

		try {
			setIsLoading(true)
			setError("")
			vscode.postMessage({
				command: "downloadTemplateContext", // type 대신 command 사용
				ddl: ddlContent,
				packageName: packageName,
				outputPath: outputPath.trim(),
			})
		} catch (err) {
			console.error("Error in downloadTemplateContext:", err)
			setError(err instanceof Error ? err.message : "Context generation error")
			setIsLoading(false)
		}
	}

	const handleInsertSampleDDL = () => {
		console.log("Insert sample DDL clicked")
		try {
			const sampleDDL = generateSampleDDLStrict()
			setDdlContent(sampleDDL)
		} catch (err) {
			console.error("Error generating sample DDL:", err)
			setError("Failed to generate sample DDL")
		}
	}

	const handleSelectOutputPath = () => {
		console.log("🗂️ Select output path clicked")
		if (!vscode) return
		vscode.postMessage({ type: "selectOutputPath" })
	}

	console.log("CodeView rendering with state:", {
		ddlContentLength: ddlContent.length,
		isValid,
		parsedDDL: !!parsedDDL,
		error,
		outputPath,
		packageName,
	})

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
			</div>

			{/* Error Display */}
			{error && (
				<div style={{ marginBottom: "20px" }}>
					<div
						style={{
							backgroundColor: "var(--vscode-inputValidation-errorBackground)",
							border: "1px solid var(--vscode-inputValidation-errorBorder)",
							color: "var(--vscode-inputValidation-errorForeground)",
							padding: "10px",
							borderRadius: "3px",
							fontSize: "12px",
						}}>
						<span className="codicon codicon-error" style={{ marginRight: "6px" }}></span>
						{error}
					</div>
				</div>
			)}

			{/* Parsed DDL Preview */}
			{isValid && parsedDDL && (
				<div style={{ marginBottom: "20px" }}>
					<h4 style={{ color: "var(--vscode-foreground)", marginBottom: "10px", marginTop: 0 }}>
						Parsed DDL Preview
					</h4>
					<div
						style={{
							backgroundColor: "var(--vscode-editor-background)",
							border: "1px solid var(--vscode-panel-border)",
							padding: "12px",
							borderRadius: "3px",
							fontSize: "12px",
							fontFamily: "monospace",
						}}>
						<div><strong>Table:</strong> {parsedDDL.tableName}</div>
						<div><strong>Attributes:</strong> {parsedDDL.attributes.length}</div>
						<div><strong>Primary Keys:</strong> {parsedDDL.pkAttributes.length}</div>
						{parsedDDL.attributes.slice(0, 5).map((attr, idx) => (
							<div key={idx} style={{ marginLeft: "10px", color: "var(--vscode-descriptionForeground)" }}>
								{attr.columnName} ({attr.dataType}) → {attr.ccName} ({attr.javaType})
								{attr.isPrimaryKey && <span style={{ color: "var(--vscode-terminal-ansiYellow)" }}> [PK]</span>}
							</div>
						))}
						{parsedDDL.attributes.length > 5 && (
							<div style={{ marginLeft: "10px", color: "var(--vscode-descriptionForeground)" }}>
								... and {parsedDDL.attributes.length - 5} more
							</div>
						)}
					</div>
				</div>
			)}

			{/* Configuration Section */}
			<div style={{ marginBottom: "20px" }}>
				<h4 style={{ color: "var(--vscode-foreground)", marginBottom: "10px", marginTop: 0 }}>
					Configuration
				</h4>
				
				{/* Package Name */}
				<div style={{ marginBottom: "15px" }}>
					<label style={{ fontSize: "12px", color: "var(--vscode-foreground)", marginBottom: "4px", display: "block" }}>
						Package Name
					</label>
					<VSCodeTextField
						style={{ width: "100%" }}
						value={packageName}
						onInput={(e: any) => setPackageName(e.target.value)}
						placeholder="com.example.project"
					/>
				</div>

				{/* Output Path */}
				<div style={{ marginBottom: "15px" }}>
					<label style={{ fontSize: "12px", color: "var(--vscode-foreground)", marginBottom: "4px", display: "block" }}>
						Output Path
					</label>
					<div style={{ display: "flex", gap: "8px" }}>
						<VSCodeTextField
							style={{ flex: 1 }}
							value={outputPath}
							onInput={(e: any) => setOutputPath(e.target.value)}
							placeholder="Select output directory..."
							readOnly
						/>
						<VSCodeButton appearance="secondary" onClick={handleSelectOutputPath}>
							Browse
						</VSCodeButton>
					</div>
				</div>
			</div>

			{/* Action Buttons */}
			<div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
				<VSCodeButton
					appearance="primary"
					onClick={handleGenerateCode}
					disabled={!isValid || isLoading || !ddlContent.trim()}>
					{isLoading && <VSCodeProgressRing style={{ marginRight: "6px" }} />}
					Generate Code
				</VSCodeButton>

				<VSCodeButton
					appearance="secondary"
					onClick={handleUploadTemplates}
					disabled={!isValid || isLoading || !ddlContent.trim()}>
					Upload Templates
				</VSCodeButton>

				<VSCodeButton
					appearance="secondary"
					onClick={handleDownloadTemplateContext}
					disabled={!isValid || isLoading || !parsedDDL}>
					Download Context
				</VSCodeButton>
			</div>
		</div>
	)
}

export default CodeView 
