import React, { useState } from "react"
import { VSCodeButton, VSCodeTextField, VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import { ConfigFormData, ConfigGenerationType } from "../types/templates"
import { useVSCode } from '../../../context/VSCodeContext'

interface PropertyFormProps {
	onSubmit: (formData: ConfigFormData) => void
	onCancel: () => void
}

const PropertyForm: React.FC<PropertyFormProps> = ({ onSubmit, onCancel }) => {
	const { vscode, isReady } = useVSCode()
	
	const [formData, setFormData] = useState<ConfigFormData>({
		generationType: ConfigGenerationType.XML,
		txtFileName: "context-properties",
		txtPropertyServiceName: "propertiesService",
		rdoPropertyType: "Internal Properties",
		txtKey: "pageUnit",
		txtValue: "20",
		cboEncoding: "UTF-8",
		txtPropertyFile: "classpath*:/egovframework/egovProps/conf/config.properties"
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
			txtFileName: value === ConfigGenerationType.XML ? "context-properties" : "EgovPropertiesConfig"
		}))
	}

	const validateForm = (): boolean => {
		const newErrors: {[key: string]: string} = {}

		if (!formData.txtFileName?.trim()) {
			newErrors.txtFileName = "File name is required"
		}
		if (!formData.txtPropertyServiceName?.trim()) {
			newErrors.txtPropertyServiceName = "Property service name is required"
		}

		if (formData.rdoPropertyType === "Internal Properties") {
			if (!formData.txtKey?.trim()) {
				newErrors.txtKey = "Key is required"
			}
			if (!formData.txtValue?.trim()) {
				newErrors.txtValue = "Value is required"
			}
		} else {
			if (!formData.txtPropertyFile?.trim()) {
				newErrors.txtPropertyFile = "Property file is required"
			}
		}

		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	const handleSubmit = async () => {
		if (validateForm()) {
			console.log("🚀 PropertyForm: handleSubmit called with VSCode ready:", isReady)
			
			if (vscode && isReady) {
				try {
					console.log("✅ PropertyForm: Sending selectFolderAndGenerate message")
					vscode.postMessage({
						type: 'selectFolderAndGenerate',
						formData: formData,
						templateType: 'property'
					})
					console.log("✅ PropertyForm: Message sent successfully")
				} catch (error) {
					console.error('❌ PropertyForm: Error sending message:', error)
					onSubmit(formData)
				}
			} else {
				console.warn("⚠️ PropertyForm: VSCode API not ready, using fallback")
				onSubmit(formData)
			}
		}
	}

	return (
		<div style={{ padding: "20px", maxWidth: "800px" }}>
			<h3 style={{ color: "var(--vscode-foreground)", marginTop: 0, marginBottom: "20px" }}>
				Create Property
			</h3>
			
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

			<h4 style={{ color: "var(--vscode-foreground)", marginBottom: "10px" }}>Configuration</h4>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Property Service Name *
				</label>
				<VSCodeTextField
					value={formData.txtPropertyServiceName}
					onInput={(e: any) => handleInputChange("txtPropertyServiceName", e.target.value)}
					style={{ width: "100%", borderColor: errors.txtPropertyServiceName ? "var(--vscode-errorForeground)" : undefined }}
				/>
				{errors.txtPropertyServiceName && (
					<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
						{errors.txtPropertyServiceName}
					</div>
				)}
			</div>

			<div style={{ marginBottom: "20px" }}>
				<label style={{ display: "block", marginBottom: "10px", color: "var(--vscode-foreground)" }}>
					Type
				</label>
				<div style={{ display: "flex", gap: "20px" }}>
					<label style={{ display: "flex", alignItems: "center", color: "var(--vscode-foreground)" }}>
						<input
							type="radio"
							name="rdoPropertyType"
							value="Internal Properties"
							checked={formData.rdoPropertyType === "Internal Properties"}
							onChange={(e) => handleInputChange("rdoPropertyType", e.target.value)}
							style={{ marginRight: "8px" }}
						/>
						Internal Properties
					</label>
					<label style={{ display: "flex", alignItems: "center", color: "var(--vscode-foreground)" }}>
						<input
							type="radio"
							name="rdoPropertyType"
							value="External File"
							checked={formData.rdoPropertyType === "External File"}
							onChange={(e) => handleInputChange("rdoPropertyType", e.target.value)}
							style={{ marginRight: "8px" }}
						/>
						External File
					</label>
				</div>
			</div>

			{formData.rdoPropertyType === "Internal Properties" && (
				<div style={{ marginLeft: "20px" }}>
					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Key *
						</label>
						<VSCodeTextField
							value={formData.txtKey}
							onInput={(e: any) => handleInputChange("txtKey", e.target.value)}
							style={{ width: "100%", borderColor: errors.txtKey ? "var(--vscode-errorForeground)" : undefined }}
						/>
						{errors.txtKey && (
							<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
								{errors.txtKey}
							</div>
						)}
					</div>

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Value *
						</label>
						<VSCodeTextField
							value={formData.txtValue}
							onInput={(e: any) => handleInputChange("txtValue", e.target.value)}
							style={{ width: "100%", borderColor: errors.txtValue ? "var(--vscode-errorForeground)" : undefined }}
						/>
						{errors.txtValue && (
							<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
								{errors.txtValue}
							</div>
						)}
					</div>
				</div>
			)}

			{formData.rdoPropertyType === "External File" && (
				<div style={{ marginLeft: "20px" }}>
					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Encoding
						</label>
						<VSCodeDropdown
							value={formData.cboEncoding}
							onInput={(e: any) => handleInputChange("cboEncoding", e.target.value)}
							style={{ width: "100%" }}>
							<VSCodeOption value="UTF-8">UTF-8</VSCodeOption>
							<VSCodeOption value="ISO-8859-1">ISO-8859-1</VSCodeOption>
							<VSCodeOption value="Windows-1252">Windows-1252</VSCodeOption>
						</VSCodeDropdown>
					</div>

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Property File Name *
						</label>
						<VSCodeTextField
							value={formData.txtPropertyFile}
							onInput={(e: any) => handleInputChange("txtPropertyFile", e.target.value)}
							style={{ width: "100%", borderColor: errors.txtPropertyFile ? "var(--vscode-errorForeground)" : undefined }}
						/>
						{errors.txtPropertyFile && (
							<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
								{errors.txtPropertyFile}
							</div>
						)}
					</div>
				</div>
			)}

			<div style={{ display: "flex", gap: "10px", marginTop: "30px" }}>
				<VSCodeButton onClick={handleSubmit}>
					Generate Configuration
				</VSCodeButton>
				<VSCodeButton appearance="secondary" onClick={onCancel}>
					Cancel
				</VSCodeButton>
			</div>
		</div>
	)
}

export default PropertyForm 