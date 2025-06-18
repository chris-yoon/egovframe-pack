import React, { useState } from "react"
import { VSCodeButton, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { ConfigFormData, ConfigGenerationType } from "../types/templates"
import { useVSCode } from '../../../context/VSCodeContext'

interface GenericFormProps {
	formType: string
	title: string
	onSubmit: (formData: ConfigFormData) => void
	onCancel: () => void
}

const GenericForm: React.FC<GenericFormProps> = ({ formType, title, onSubmit, onCancel }) => {
	const { vscode, isReady } = useVSCode()
	
	const [formData, setFormData] = useState<ConfigFormData>({
		generationType: ConfigGenerationType.XML,
		txtFileName: "context-" + formType.toLowerCase(),
		txtJndiName: formType === "jndi" ? "java:comp/env/jdbc/dataSource" : ""
	})

	const [errors, setErrors] = useState<{[key: string]: string}>({})

	const handleInputChange = (field: string, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }))
		if (errors[field]) {
			setErrors(prev => ({ ...prev, [field]: "" }))
		}
	}

	const handleGenerationTypeChange = (value: ConfigGenerationType) => {
		setFormData(prev => ({
			...prev,
			generationType: value,
			txtFileName: value === ConfigGenerationType.XML 
				? "context-" + formType.toLowerCase()
				: "Egov" + formType.charAt(0).toUpperCase() + formType.slice(1) + "Config"
		}))
	}

	const validateForm = (): boolean => {
		const newErrors: {[key: string]: string} = {}

		if (!formData.txtFileName?.trim()) {
			newErrors.txtFileName = "File name is required"
		}

		if (formType === "jndi" && !formData.txtJndiName?.trim()) {
			newErrors.txtJndiName = "JNDI name is required"
		}

		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	const handleSubmit = async () => {
		if (validateForm()) {
			console.log(`🚀 GenericForm (${formType}): handleSubmit called with VSCode ready:`, isReady)
			
			if (vscode && isReady) {
				try {
					console.log(`✅ GenericForm (${formType}): Sending selectFolderAndGenerate message`)
					vscode.postMessage({
						type: 'selectFolderAndGenerate',
						formData: formData,
						templateType: formType
					})
					console.log(`✅ GenericForm (${formType}): Message sent successfully`)
				} catch (error) {
					console.error(`❌ GenericForm (${formType}): Error sending message:`, error)
					onSubmit(formData)
				}
			} else {
				console.warn(`⚠️ GenericForm (${formType}): VSCode API not ready, using fallback`)
				onSubmit(formData)
			}
		}
	}

	return (
		<div style={{ padding: "20px", maxWidth: "800px" }}>
			<h3 style={{ color: "var(--vscode-foreground)", marginTop: 0, marginBottom: "20px" }}>
				{title}
			</h3>
			
			{/* Only show generation type selection for actual config generation */}
			{formType !== "project" && formType !== "xml" && (
				<>
					<h4 style={{ color: "var(--vscode-foreground)", marginBottom: "10px" }}>Generation Type</h4>
					<div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
						<label style={{ display: "flex", alignItems: "center", color: "var(--vscode-foreground)" }}>
							<input
								type="radio"
								name="generationType"
								value={ConfigGenerationType.XML}
								checked={formData.generationType === ConfigGenerationType.XML}
								onChange={(e) => handleGenerationTypeChange(e.target.value as ConfigGenerationType)}
								style={{ marginRight: "8px" }}
							/>
							XML
						</label>
						<label style={{ display: "flex", alignItems: "center", color: "var(--vscode-foreground)" }}>
							<input
								type="radio"
								name="generationType"
								value={ConfigGenerationType.JAVA_CONFIG}
								checked={formData.generationType === ConfigGenerationType.JAVA_CONFIG}
								onChange={(e) => handleGenerationTypeChange(e.target.value as ConfigGenerationType)}
								style={{ marginRight: "8px" }}
							/>
							JavaConfig
						</label>
					</div>

					<h4 style={{ color: "var(--vscode-foreground)", marginBottom: "10px" }}>Generation File</h4>
					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							File Name *
						</label>
						<VSCodeTextField
							value={formData.txtFileName}
							onInput={(e: any) => handleInputChange("txtFileName", e.target.value)}
							style={{ width: "100%", borderColor: errors.txtFileName ? "var(--vscode-errorForeground)" : undefined }}
						/>
						{errors.txtFileName && (
							<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
								{errors.txtFileName}
							</div>
						)}
					</div>
				</>
			)}

			<h4 style={{ color: "var(--vscode-foreground)", marginBottom: "10px" }}>Configuration</h4>

			{formType === "jndi" && (
				<div style={{ marginBottom: "15px" }}>
					<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
						JNDI Name *
					</label>
					<VSCodeTextField
						value={formData.txtJndiName}
						onInput={(e: any) => handleInputChange("txtJndiName", e.target.value)}
						placeholder="java:comp/env/jdbc/dataSource"
						style={{ width: "100%", borderColor: errors.txtJndiName ? "var(--vscode-errorForeground)" : undefined }}
					/>
					{errors.txtJndiName && (
						<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
							{errors.txtJndiName}
						</div>
					)}
				</div>
			)}

			{formType === "project" && (
				<div style={{ marginBottom: "15px" }}>
					<p style={{ color: "var(--vscode-descriptionForeground)", fontSize: "14px" }}>
						This will generate a new eGovFrame project structure with basic configuration files.
					</p>
				</div>
			)}

			{formType === "xml" && (
				<div style={{ marginBottom: "15px" }}>
					<p style={{ color: "var(--vscode-descriptionForeground)", fontSize: "14px" }}>
						This will generate XML configuration files based on your form inputs.
					</p>
				</div>
			)}

			<div style={{ display: "flex", gap: "10px", marginTop: "30px" }}>
				<VSCodeButton onClick={handleSubmit}>
					{formType === "project" ? "Generate Project" : "Generate Configuration"}
				</VSCodeButton>
				<VSCodeButton appearance="secondary" onClick={onCancel}>
					Cancel
				</VSCodeButton>
			</div>
		</div>
	)
}

export default GenericForm 