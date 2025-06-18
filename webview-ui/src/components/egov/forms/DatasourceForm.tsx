import React, { useState } from "react"
import { VSCodeButton, VSCodeTextField, VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import { ConfigFormData, ConfigGenerationType } from "../types/templates"
import { useVSCode } from '../../../context/VSCodeContext'

interface DatasourceFormProps {
	onSubmit: (formData: ConfigFormData) => void
	onCancel: () => void
}

const DatasourceForm: React.FC<DatasourceFormProps> = ({ onSubmit, onCancel }) => {
	const { vscode, isReady } = useVSCode()
	const [formData, setFormData] = useState<ConfigFormData>({
		generationType: ConfigGenerationType.XML,
		txtFileName: "context-datasource",
		txtDatasourceName: "dataSource",
		rdoType: "DBCP",
		txtDriver: "",
		txtUrl: "",
		txtUser: "",
		txtPasswd: "",
	})

	const [errors, setErrors] = useState<{[key: string]: string}>({})

	const handleInputChange = (field: string, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }))
		// Clear error when user starts typing
		if (errors[field]) {
			setErrors(prev => ({
				...prev,
				[field]: ""
			}))
		}
	}

	const validateForm = (): boolean => {
		const newErrors: {[key: string]: string} = {}

		// Required fields validation
		if (!formData.txtFileName?.trim()) {
			newErrors.txtFileName = "File name is required"
		}
		if (!formData.txtDatasourceName?.trim()) {
			newErrors.txtDatasourceName = "Datasource name is required"
		}
		if (!formData.txtDriver?.trim()) {
			newErrors.txtDriver = "Driver is required"
		}
		if (!formData.txtUrl?.trim()) {
			newErrors.txtUrl = "URL is required"
		}
		if (!formData.txtUser?.trim()) {
			newErrors.txtUser = "User is required"
		}

		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	const handleGenerationTypeChange = (value: ConfigGenerationType) => {
		setFormData(prev => ({
			...prev,
			generationType: value,
			txtFileName: value === ConfigGenerationType.XML ? "context-datasource" : "EgovDataSourceConfig"
		}))
	}

	const handleSubmit = async () => {
		if (validateForm()) {
			console.log("🚀 DatasourceForm: handleSubmit called with VSCode ready:", isReady)
			
			if (vscode && isReady) {
				try {
					console.log("✅ DatasourceForm: Sending selectFolderAndGenerate message")
					vscode.postMessage({
						type: 'selectFolderAndGenerate',
						formData: formData,
						templateType: 'datasource'
					})
					console.log("✅ DatasourceForm: Message sent successfully")
				} catch (error) {
					console.error('❌ DatasourceForm: Error sending message:', error)
					// Fallback to parent handler
					onSubmit(formData)
				}
			} else {
				console.warn("⚠️ DatasourceForm: VSCode API not ready, using fallback")
				onSubmit(formData)
			}
		}
	}

	return (
		<div style={{ padding: "20px", maxWidth: "800px" }}>
			<h3 style={{ color: "var(--vscode-foreground)", marginTop: 0, marginBottom: "20px" }}>
				Create DataSource
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
					placeholder="Enter file name"
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
					DataSource Name *
				</label>
				<VSCodeTextField
					value={formData.txtDatasourceName}
					onInput={(e: any) => handleInputChange("txtDatasourceName", e.target.value)}
					style={{ width: "100%", borderColor: errors.txtDatasourceName ? "var(--vscode-errorForeground)" : undefined }}
				/>
				{errors.txtDatasourceName && (
					<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
						{errors.txtDatasourceName}
					</div>
				)}
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Driver Type
				</label>
				<VSCodeDropdown
					value={formData.rdoType}
					onInput={(e: any) => handleInputChange("rdoType", e.target.value)}
					style={{ width: "100%" }}>
					<VSCodeOption value="DBCP">DBCP</VSCodeOption>
					<VSCodeOption value="C3P0">C3P0</VSCodeOption>
					<VSCodeOption value="JDBC">JDBC</VSCodeOption>
				</VSCodeDropdown>
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Driver *
				</label>
				<VSCodeTextField
					value={formData.txtDriver}
					onInput={(e: any) => handleInputChange("txtDriver", e.target.value)}
					style={{ width: "100%", borderColor: errors.txtDriver ? "var(--vscode-errorForeground)" : undefined }}
					placeholder="Enter driver class name"
				/>
				{errors.txtDriver && (
					<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
						{errors.txtDriver}
					</div>
				)}
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					URL *
				</label>
				<VSCodeTextField
					value={formData.txtUrl}
					onInput={(e: any) => handleInputChange("txtUrl", e.target.value)}
					style={{ width: "100%", borderColor: errors.txtUrl ? "var(--vscode-errorForeground)" : undefined }}
					placeholder="Enter database URL"
				/>
				{errors.txtUrl && (
					<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
						{errors.txtUrl}
					</div>
				)}
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					User *
				</label>
				<VSCodeTextField
					value={formData.txtUser}
					onInput={(e: any) => handleInputChange("txtUser", e.target.value)}
					style={{ width: "100%", borderColor: errors.txtUser ? "var(--vscode-errorForeground)" : undefined }}
					placeholder="Enter username"
				/>
				{errors.txtUser && (
					<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
						{errors.txtUser}
					</div>
				)}
			</div>

			<div style={{ marginBottom: "20px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Password
				</label>
				<VSCodeTextField
					value={formData.txtPasswd}
					onInput={(e: any) => handleInputChange("txtPasswd", e.target.value)}
					style={{ width: "100%" }}
					placeholder="Enter password"
				/>
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

export default DatasourceForm 