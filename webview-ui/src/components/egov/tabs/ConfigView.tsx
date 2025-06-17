import React, { useState, useEffect } from "react"
import { VSCodeButton, VSCodeDropdown, VSCodeOption, VSCodeDivider, VSCodeLink } from "@vscode/webview-ui-toolkit/react"

// VSCode API 타입 정의
declare global {
	function acquireVsCodeApi(): {
		postMessage: (message: any) => void
		getState: () => any
		setState: (state: any) => void
	}
}

interface TemplateConfig {
	displayName: string
	templateFile: string
	templateFolder: string
	description?: string
}

interface GroupedTemplates {
	[category: string]: {
		[subcategory: string]: TemplateConfig
	}
}

interface ConfigFormData {
	[key: string]: any
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

// 샘플 템플릿 데이터
const loadTemplates = async (): Promise<TemplateConfig[]> => {
	return [
		{
			displayName: "DataSource > DataSource",
			templateFile: "datasource.xml",
			templateFolder: "datasource",
			description: "Database connection configuration"
		},
		{
			displayName: "DataSource > JNDI DataSource", 
			templateFile: "jndi-datasource.xml",
			templateFolder: "datasource",
			description: "JNDI-based database connection"
		},
		{
			displayName: "Transaction > DataSource Transaction",
			templateFile: "datasource-transaction.xml", 
			templateFolder: "transaction",
			description: "Transaction management configuration"
		},
		{
			displayName: "Transaction > JPA Transaction",
			templateFile: "jpa-transaction.xml",
			templateFolder: "transaction", 
			description: "JPA transaction management"
		},
		{
			displayName: "Logging > Console Logging",
			templateFile: "console-logging.xml",
			templateFolder: "logging",
			description: "Console-based logging configuration"
		},
		{
			displayName: "Logging > File Logging",
			templateFile: "file-logging.xml", 
			templateFolder: "logging",
			description: "File-based logging configuration"
		},
		{
			displayName: "Cache > EHCache",
			templateFile: "ehcache.xml",
			templateFolder: "cache",
			description: "EHCache configuration"
		},
		{
			displayName: "Property > Property Configuration",
			templateFile: "property.xml",
			templateFolder: "property", 
			description: "Property management configuration"
		}
	]
}

// 폼 팩토리 컴포넌트 (간단한 버전)
const FormFactory: React.FC<{
	template: TemplateConfig
	onSubmit: (data: ConfigFormData) => void
	onCancel: () => void
}> = ({ template, onSubmit, onCancel }) => {
	const [formData, setFormData] = useState<ConfigFormData>({})

	const handleSubmit = () => {
		onSubmit(formData)
	}

	return (
		<div style={{ padding: "20px", maxWidth: "800px" }}>
			<h3 style={{ color: "var(--vscode-foreground)", marginTop: 0, marginBottom: "20px" }}>
				Configure {template.displayName}
			</h3>
			
			<div style={{ marginBottom: "20px" }}>
				<p style={{ color: "var(--vscode-descriptionForeground)", marginBottom: "15px" }}>
					{template.description}
				</p>
				
				<div style={{ 
					backgroundColor: "var(--vscode-textBlockQuote-background)",
					border: "1px solid var(--vscode-textBlockQuote-border)",
					padding: "15px",
					borderRadius: "4px",
					marginBottom: "20px"
				}}>
					<div style={{ fontSize: "12px", marginBottom: "8px" }}>
						<strong>Template File:</strong> {template.templateFile}
					</div>
					<div style={{ fontSize: "12px" }}>
						<strong>Category:</strong> {template.templateFolder}
					</div>
				</div>
			</div>

			<div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
				<VSCodeButton appearance="secondary" onClick={onCancel}>
					Cancel
				</VSCodeButton>
				<VSCodeButton appearance="primary" onClick={handleSubmit}>
					Generate Configuration
				</VSCodeButton>
			</div>
		</div>
	)
}

const ConfigView: React.FC = () => {
	const [templates, setTemplates] = useState<TemplateConfig[]>([])
	const [groupedTemplates, setGroupedTemplates] = useState<GroupedTemplates>({})
	const [selectedCategory, setSelectedCategory] = useState<string>("")
	const [selectedSubcategory, setSelectedSubcategory] = useState<string>("")
	const [selectedTemplate, setSelectedTemplate] = useState<TemplateConfig | null>(null)
	const [currentView, setCurrentView] = useState<"list" | "form">("list")
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const initializeTemplates = async () => {
			try {
				setLoading(true)
				const loadedTemplates = await loadTemplates()
				console.log("Loaded templates:", loadedTemplates)
				setTemplates(loadedTemplates)

				// Group templates by category and subcategory
				const grouped: GroupedTemplates = {}
				loadedTemplates.forEach((template) => {
					const [category, subcategory] = template.displayName.split(" > ")
					if (!grouped[category]) {
						grouped[category] = {}
					}
					grouped[category][subcategory] = template
				})

				console.log("Grouped templates:", grouped)
				setGroupedTemplates(grouped)
				setError(null)
			} catch (err) {
				console.error("Failed to load templates:", err)
				setError("Failed to load templates. Please try again.")
			} finally {
				setLoading(false)
			}
		}

		initializeTemplates()
	}, [])

	const handleCategoryChange = (category: string) => {
		console.log("Category selected:", category)
		setSelectedCategory(category)
		setSelectedSubcategory("")
		setSelectedTemplate(null)
	}

	const handleSubcategoryChange = (subcategory: string) => {
		console.log("Subcategory selected:", subcategory)
		setSelectedSubcategory(subcategory)

		if (selectedCategory && subcategory && groupedTemplates[selectedCategory]) {
			const template = groupedTemplates[selectedCategory][subcategory]
			if (template) {
				setSelectedTemplate(template)
				console.log("Template selected:", template)
			}
		}
	}

	const handleConfigureClick = () => {
		if (selectedTemplate) {
			console.log("Opening form for template:", selectedTemplate)
			setCurrentView("form")
		}
	}

	const handleFormSubmit = (formData: ConfigFormData) => {
		console.log("Form submitted with data:", formData)
		console.log("Selected template:", selectedTemplate)

		if (!selectedTemplate) {
			console.error("No template selected")
			return
		}

		// Post message to generate config
		try {
			vscode.postMessage({
				type: "generateConfig",
				template: selectedTemplate,
				formData: formData,
			})
		} catch (error) {
			console.error("Error sending message:", error)
		}

		// Return to list view
		setCurrentView("list")
	}

	const handleFormCancel = () => {
		console.log("Form cancelled")
		setCurrentView("list")
	}

	if (loading) {
		return (
			<div style={{ padding: "20px", textAlign: "center" }}>
				<p style={{ color: "var(--vscode-foreground)" }}>Loading templates...</p>
			</div>
		)
	}

	if (error) {
		return (
			<div style={{ padding: "20px", textAlign: "center" }}>
				<p style={{ color: "var(--vscode-errorForeground)" }}>{error}</p>
				<VSCodeButton onClick={() => window.location.reload()}>Retry</VSCodeButton>
			</div>
		)
	}

	if (currentView === "form" && selectedTemplate) {
		return <FormFactory template={selectedTemplate} onSubmit={handleFormSubmit} onCancel={handleFormCancel} />
	}

	const categories = Object.keys(groupedTemplates)
	const subcategories = selectedCategory ? Object.keys(groupedTemplates[selectedCategory] || {}) : []

	return (
		<div style={{ padding: "20px", maxWidth: "800px" }}>
			{/* Header */}
			<div style={{ marginBottom: "20px" }}>
				<h3 style={{ color: "var(--vscode-foreground)", marginTop: 0, marginBottom: "8px" }}>
					Generate eGovFrame Configurations
				</h3>
				<p
					style={{
						fontSize: "12px",
						color: "var(--vscode-descriptionForeground)",
						margin: 0,
						marginTop: "5px",
					}}>
					Generate configuration files for eGovFrame projects. Learn more at{" "}
					<VSCodeLink href="https://github.com/chris-yoon/egovframe-pack" style={{ display: "inline" }}>
						GitHub
					</VSCodeLink>
				</p>
			</div>

			<div style={{ marginBottom: "20px" }}>
				<div style={{ marginBottom: "15px" }}>
					<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
						Select Category
					</label>
					<VSCodeDropdown
						value={selectedCategory}
						onInput={(e: any) => handleCategoryChange(e.target.value)}
						style={{ width: "100%" }}>
						<VSCodeOption value="">-- Select Category --</VSCodeOption>
						{categories.map((category) => (
							<VSCodeOption key={category} value={category}>
								{category}
							</VSCodeOption>
						))}
					</VSCodeDropdown>
				</div>

				{selectedCategory && (
					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Select Configuration Type
						</label>
						<VSCodeDropdown
							value={selectedSubcategory}
							onInput={(e: any) => handleSubcategoryChange(e.target.value)}
							style={{ width: "100%" }}>
							<VSCodeOption value="">-- Select Configuration Type --</VSCodeOption>
							{subcategories.map((subcategory) => (
								<VSCodeOption key={subcategory} value={subcategory}>
									{subcategory}
								</VSCodeOption>
							))}
						</VSCodeDropdown>
					</div>
				)}

				{selectedTemplate && (
					<div style={{ marginTop: "20px" }}>
						<VSCodeDivider />
						<div
							style={{
								marginTop: "20px",
								padding: "15px",
								border: "1px solid var(--vscode-panel-border)",
								borderRadius: "4px",
							}}>
							<h3 style={{ color: "var(--vscode-foreground)", marginBottom: "10px" }}>Selected Configuration</h3>
							<p style={{ color: "var(--vscode-foreground)", marginBottom: "15px" }}>
								<strong>Name:</strong> {selectedTemplate.displayName}
							</p>
							<p style={{ color: "var(--vscode-foreground)", marginBottom: "15px" }}>
								<strong>Template:</strong> {selectedTemplate.templateFile}
							</p>
							<p style={{ color: "var(--vscode-foreground)", marginBottom: "15px" }}>
								<strong>Folder:</strong> {selectedTemplate.templateFolder}
							</p>
							<VSCodeButton onClick={handleConfigureClick} appearance="primary">
								Configure
							</VSCodeButton>
						</div>
					</div>
				)}
			</div>

			{templates.length === 0 && !loading && (
				<div style={{ textAlign: "center", padding: "40px" }}>
					<p style={{ color: "var(--vscode-foreground)" }}>No templates available</p>
				</div>
			)}
		</div>
	)
}

export default ConfigView 