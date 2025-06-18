import React, { useState, useEffect } from "react"
import { VSCodeButton, VSCodeDropdown, VSCodeOption, VSCodeDivider, VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { TemplateConfig, GroupedTemplates, ConfigFormData } from "../types/templates"
import { loadTemplates } from "../utils/templateUtils"
import FormFactory from "../forms/FormFactory"
import { vscode } from "../../../utils/vscode"

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
				console.log("🔍 VSCode API test on component mount:", !!vscode)
				if (vscode) {
					console.log("✅ VSCode API methods available:", Object.keys(vscode))
				}
				
				const loadedTemplates = loadTemplates()
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
		console.log("VSCode API available:", !!vscode)
		console.log("VSCode API object:", vscode)

		if (!selectedTemplate) {
			console.error("No template selected")
			return
		}

		// Handle folder selection and config generation
		if (vscode) {
			console.log("✅ Sending message to VSCode extension...")
			
			// Determine template type from selected template
			let templateType = ""
			if (selectedTemplate.displayName.includes("DataSource")) {
				templateType = "datasource"
			} else if (selectedTemplate.displayName.includes("Cache")) {
				templateType = "cache"
			} else if (selectedTemplate.displayName.includes("ID Generation")) {
				templateType = "idGeneration"
			} else if (selectedTemplate.displayName.includes("Logging")) {
				templateType = "logging"
			} else {
				// Fallback to using displayName
				templateType = selectedTemplate.displayName.toLowerCase().replace(/\s+/g, '-')
			}
			
			const message = {
				type: "selectFolderAndGenerate",
				template: selectedTemplate,
				formData: formData,
				templateType: templateType
			}
			
			console.log("📨 Message to send:", message)
			
			try {
				vscode.postMessage(message)
				console.log("✅ Message sent successfully")
				
				// Fallback: If extension host is unresponsive, try command execution
				setTimeout(() => {
					console.log("🔄 Trying fallback command execution...")
					try {
						vscode.postMessage({
							type: "executeCommand",
							command: "extension.selectFolderForConfig"
						})
					} catch (fallbackError) {
						console.error("❌ Fallback command failed:", fallbackError)
					}
				}, 1000)
				
			} catch (error) {
				console.error("❌ Error sending message:", error)
			}
		} else {
			console.error("❌ VSCode API not available - running in standalone mode")
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