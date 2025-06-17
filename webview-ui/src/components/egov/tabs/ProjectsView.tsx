import { useState, useEffect, useRef } from "react"
import {
	VSCodeButton,
	VSCodeDropdown,
	VSCodeOption,
	VSCodeTextField,
	VSCodeLink,
} from "@vscode/webview-ui-toolkit/react"

// VSCode API 타입 정의
declare global {
	function acquireVsCodeApi(): {
		postMessage: (message: any) => void
		getState: () => any
		setState: (state: any) => void
	}
}

interface ProjectTemplate {
	displayName: string
	fileName: string
	description?: string
	category?: string
}

const PROJECT_CATEGORIES = ["All", "Web", "Template", "Mobile", "Boot", "MSA", "Batch"]

export const ProjectsView = () => {
	const [selectedCategory, setSelectedCategory] = useState<string>("All")
	const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null)
	const [projectName, setProjectName] = useState<string>("")
	const [groupID, setGroupID] = useState<string>("egovframework.example.sample")
	const [outputPath, setOutputPath] = useState<string>("")
	const [templates, setTemplates] = useState<ProjectTemplate[]>([])
	const [validationErrors, setValidationErrors] = useState<string[]>([])
	const [isGenerating, setIsGenerating] = useState<boolean>(false)
	const [generationStatus, setGenerationStatus] = useState<string>("")

	// VS Code API를 한 번만 획득하도록 useRef 사용
	const vsCodeRef = useRef<any>(null)
	
	if (!vsCodeRef.current) {
		try {
			vsCodeRef.current = acquireVsCodeApi()
			console.log('✅ ProjectsView: VS Code API acquired successfully')
		} catch (error) {
			console.error('❌ ProjectsView: Failed to acquire VS Code API:', error)
		}
	}

	// 템플릿 필터링
	const filteredTemplates = templates.filter(template => 
		selectedCategory === "All" || template.category === selectedCategory
	)

	useEffect(() => {
		console.log('🔧 ProjectsView: useEffect running...')
		
		// 샘플 프로젝트 이름 설정
		setProjectName("my-egov-project")

		if (vsCodeRef.current) {
			// 템플릿 목록 요청
			vsCodeRef.current.postMessage({ command: "loadTemplates" })

			// 현재 작업공간 경로 요청
			vsCodeRef.current.postMessage({ command: "getWorkspacePath" })
		}

		// 메시지 리스너
		const handleMessage = (event: MessageEvent) => {
			const message = event.data
			console.log('📨 ProjectsView received message:', message.command)
			
			switch (message.command) {
				case "templatesLoaded":
					if (message.templates) {
						console.log('📋 Templates loaded:', message.templates.length)
						setTemplates(message.templates)
					}
					break
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
				case "projectGenerationResult":
					setIsGenerating(false)
					if (message.success) {
						setGenerationStatus(`✅ Project generated successfully at: ${message.projectPath}`)
						// 폼 리셋
						setSelectedTemplate(null)
						setProjectName("my-egov-project")
						setValidationErrors([])
					} else {
						setGenerationStatus(`❌ Generation failed: ${message.error}`)
					}
					break
				case "projectGenerationProgress":
					setGenerationStatus(message.text || "")
					break
			}
		}

		window.addEventListener("message", handleMessage)
		return () => {
			console.log('🧹 ProjectsView: Cleaning up message listener')
			window.removeEventListener("message", handleMessage)
		}
	}, []) // 의존성 배열을 비워서 한 번만 실행

	const handleCategoryChange = (event: any) => {
		const category = event.target.value
		setSelectedCategory(category)
		setSelectedTemplate(null) // 카테고리 변경 시 템플릿 선택 초기화
	}

	const handleTemplateSelect = (template: ProjectTemplate) => {
		setSelectedTemplate(template)
		setValidationErrors([])
		setGenerationStatus("")
	}

	const handleSelectOutputPath = () => {
		if (vsCodeRef.current) {
			vsCodeRef.current.postMessage({ command: "selectOutputPath" })
		}
	}

	const validateForm = (): boolean => {
		const errors: string[] = []

		if (!selectedTemplate) {
			errors.push("Please select a project template")
		}

		if (!projectName.trim()) {
			errors.push("Project name is required")
		}

		if (!groupID.trim()) {
			errors.push("Group ID is required")
		}

		if (!outputPath.trim()) {
			errors.push("Output path is required")
		}

		setValidationErrors(errors)
		return errors.length === 0
	}

	const handleGenerateProject = async () => {
		if (!validateForm()) {
			return
		}

		setIsGenerating(true)
		setGenerationStatus("🚀 Starting project generation...")

		try {
			const config = {
				projectName,
				groupID,
				outputPath,
				template: selectedTemplate!,
			}

			if (vsCodeRef.current) {
				vsCodeRef.current.postMessage({
					command: "generateProject",
					config
				})
			}
		} catch (error) {
			console.error("Error generating project:", error)
			setIsGenerating(false)
			setGenerationStatus(`❌ Error: ${error}`)
		}
	}

	return (
		<div style={{ padding: "8px", fontSize: "11px" }}>
			{/* Header - 사이드바용으로 간소화 */}
			<div style={{ marginBottom: "12px" }}>
				<h4 style={{ 
					color: "var(--vscode-foreground)", 
					marginTop: 0, 
					marginBottom: "4px",
					fontSize: "12px",
					fontWeight: "600"
				}}>
					📦 Generate eGovFrame Projects
				</h4>
				<p style={{
					fontSize: "10px",
					color: "var(--vscode-descriptionForeground)",
					margin: 0,
					lineHeight: "1.3"
				}}>
					Generate projects from templates
				</p>
			</div>

			{/* Generation Status */}
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

			{/* Category Selection */}
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
					onInput={handleCategoryChange}
					style={{ width: "100%", fontSize: "10px" }}>
					{PROJECT_CATEGORIES.map((category) => (
						<VSCodeOption key={category} value={category}>
							{category}
						</VSCodeOption>
					))}
				</VSCodeDropdown>
			</div>

			{/* Template Selection */}
			{filteredTemplates.length > 0 && (
				<div style={{ marginBottom: "12px" }}>
					<label style={{ 
						display: "block", 
						marginBottom: "3px", 
						color: "var(--vscode-foreground)",
						fontSize: "10px",
						fontWeight: "500"
					}}>
						Template ({filteredTemplates.length})
					</label>
					<div style={{ 
						maxHeight: "120px", 
						overflowY: "auto",
						border: "1px solid var(--vscode-input-border)",
						borderRadius: "3px"
					}}>
						{filteredTemplates.slice(0, 5).map((template, index) => (
							<div
								key={index}
								onClick={() => handleTemplateSelect(template)}
								style={{
									padding: "6px",
									cursor: "pointer",
									backgroundColor: selectedTemplate === template 
										? "var(--vscode-list-activeSelectionBackground)" 
										: "transparent",
									color: selectedTemplate === template 
										? "var(--vscode-list-activeSelectionForeground)" 
										: "var(--vscode-foreground)",
									borderBottom: index < Math.min(filteredTemplates.length, 5) - 1 
										? "1px solid var(--vscode-panel-border)" 
										: "none",
									fontSize: "10px"
								}}
								onMouseEnter={(e) => {
									if (selectedTemplate !== template) {
										e.currentTarget.style.backgroundColor = "var(--vscode-list-hoverBackground)"
									}
								}}
								onMouseLeave={(e) => {
									if (selectedTemplate !== template) {
										e.currentTarget.style.backgroundColor = "transparent"
									}
								}}>
								<div style={{ fontWeight: "bold", marginBottom: "2px" }}>
									{template.displayName}
								</div>
								{template.description && (
									<div style={{ 
										fontSize: "9px", 
										color: "var(--vscode-descriptionForeground)",
										lineHeight: "1.2"
									}}>
										{template.description.length > 50 
											? template.description.substring(0, 50) + "..." 
											: template.description}
									</div>
								)}
							</div>
						))}
						{filteredTemplates.length > 5 && (
							<div style={{ 
								padding: "4px", 
								textAlign: "center", 
								fontSize: "9px",
								color: "var(--vscode-descriptionForeground)"
							}}>
								+{filteredTemplates.length - 5} more templates...
							</div>
						)}
					</div>
				</div>
			)}

			{/* Project Configuration - 간소화 */}
			<div style={{ marginBottom: "8px" }}>
				<label style={{ 
					display: "block", 
					marginBottom: "3px", 
					color: "var(--vscode-foreground)",
					fontSize: "10px",
					fontWeight: "500"
				}}>
					Project Name
				</label>
				<VSCodeTextField
					value={projectName}
					onInput={(e: any) => setProjectName(e.target.value)}
					placeholder="my-egov-project"
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
					Group ID
				</label>
				<VSCodeTextField
					value={groupID}
					onInput={(e: any) => setGroupID(e.target.value)}
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

			{/* Validation Errors */}
			{validationErrors.length > 0 && (
				<div style={{ 
					padding: "6px", 
					marginBottom: "8px", 
					backgroundColor: "var(--vscode-inputValidation-errorBackground)",
					color: "var(--vscode-inputValidation-errorForeground)",
					borderRadius: "3px",
					fontSize: "9px"
				}}>
					{validationErrors.map((error, index) => (
						<div key={index}>• {error}</div>
					))}
				</div>
			)}

			{/* Generate Button */}
			<VSCodeButton 
				onClick={handleGenerateProject}
				disabled={isGenerating}
				style={{ 
					width: "100%", 
					fontSize: "10px",
					padding: "6px"
				}}>
				{isGenerating ? "Generating..." : "Generate Project"}
			</VSCodeButton>
		</div>
	)
}

export default ProjectsView 