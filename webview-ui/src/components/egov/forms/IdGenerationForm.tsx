import React, { useState } from "react"
import { VSCodeButton, VSCodeTextField, VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react"
import { ConfigFormData, ConfigGenerationType, FormComponentProps } from "../types/templates"
import { vscode } from "../utils/vscode"

const IdGenerationForm: React.FC<FormComponentProps> = ({ template, onSubmit, onCancel, initialData }) => {
	const [formData, setFormData] = useState<ConfigFormData>({
		generationType: ConfigGenerationType.XML,
		txtFileName: "context-idgn-table",
		txtIdServiceName: "tableIdGnrService",
		txtDatasourceName: "dataSource",
		txtTableId: "SEQ_TABLE",
		txtTableName: "SEQ_COLUMN",
		txtBlockSize: "10",
		chkStrategy: false,
		txtStrategyName: "prefixIdGnrStrategy",
		txtPrefix: "PRE",
		txtCipers: "20",
		txtFillChar: "0",
		// For sequence type
		txtQuery: "",
		// For UUID type
		rdoIdType: "sequence",
		...initialData
	})

	const [errors, setErrors] = useState<{[key: string]: string}>({})

	const getIdType = () => {
		if (template.webView.includes("sequence")) return "sequence"
		if (template.webView.includes("table")) return "table"
		if (template.webView.includes("uuid")) return "uuid"
		return "table"
	}

	const idType = getIdType()

	const handleInputChange = (field: string, value: string | boolean) => {
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
		if (!formData.txtIdServiceName?.trim()) {
			newErrors.txtIdServiceName = "ID Service name is required"
		}
		
		// Type-specific validations
		if (idType === "table") {
			if (!formData.txtDatasourceName?.trim()) {
				newErrors.txtDatasourceName = "Datasource name is required"
			}
			if (!formData.txtTableId?.trim()) {
				newErrors.txtTableId = "Table ID is required"
			}
			if (!formData.txtTableName?.trim()) {
				newErrors.txtTableName = "Table name is required"
			}
		} else if (idType === "sequence") {
			if (!formData.txtDatasourceName?.trim()) {
				newErrors.txtDatasourceName = "Datasource name is required"
			}
			if (!formData.txtQuery?.trim()) {
				newErrors.txtQuery = "Query is required"
			}
		}

		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	const handleGenerationTypeChange = (value: ConfigGenerationType) => {
		setFormData(prev => ({
			...prev,
			generationType: value,
			txtFileName: value === ConfigGenerationType.XML 
				? `context-idgn-${idType}` 
				: `EgovIdgn${idType.charAt(0).toUpperCase() + idType.slice(1)}Config`
		}))
	}

	const handleSubmit = () => {
		if (validateForm()) {
			// Open folder selection dialog via VSCode API
			if (vscode) {
				vscode.postMessage({
					type: 'selectFolderAndGenerate',
					formData: formData,
					templateType: 'idgen'
				})
			} else {
				console.error('VSCode API not available')
			}
		}
	}

	const renderTableIdForm = () => (
		<>
			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					ID Service Name *
				</label>
				<VSCodeTextField
					value={formData.txtIdServiceName}
					onInput={(e: any) => handleInputChange("txtIdServiceName", e.target.value)}
					style={{ width: "100%", borderColor: errors.txtIdServiceName ? "var(--vscode-errorForeground)" : undefined }}
				/>
				{errors.txtIdServiceName && (
					<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
						{errors.txtIdServiceName}
					</div>
				)}
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Datasource Name *
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
					Table ID *
				</label>
				<VSCodeTextField
					value={formData.txtTableId}
					onInput={(e: any) => handleInputChange("txtTableId", e.target.value)}
					style={{ width: "100%", borderColor: errors.txtTableId ? "var(--vscode-errorForeground)" : undefined }}
				/>
				{errors.txtTableId && (
					<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
						{errors.txtTableId}
					</div>
				)}
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Table Name *
				</label>
				<VSCodeTextField
					value={formData.txtTableName}
					onInput={(e: any) => handleInputChange("txtTableName", e.target.value)}
					style={{ width: "100%", borderColor: errors.txtTableName ? "var(--vscode-errorForeground)" : undefined }}
				/>
				{errors.txtTableName && (
					<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
						{errors.txtTableName}
					</div>
				)}
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Block Size
				</label>
				<VSCodeTextField
					value={formData.txtBlockSize}
					onInput={(e: any) => handleInputChange("txtBlockSize", e.target.value)}
					style={{ width: "100%" }}
					placeholder="10"
				/>
			</div>

			<div style={{ marginBottom: "20px" }}>
				<VSCodeCheckbox
					checked={formData.chkStrategy as boolean}
					onChange={(e: any) => handleInputChange("chkStrategy", e.target.checked)}
				>
					Use Strategy
				</VSCodeCheckbox>
			</div>

			{formData.chkStrategy && (
				<div style={{ 
					paddingLeft: "20px", 
					borderLeft: "2px solid var(--vscode-panel-border)", 
					marginBottom: "20px" 
				}}>
					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Strategy Name
						</label>
						<VSCodeTextField
							value={formData.txtStrategyName}
							onInput={(e: any) => handleInputChange("txtStrategyName", e.target.value)}
							style={{ width: "100%" }}
						/>
					</div>

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Prefix
						</label>
						<VSCodeTextField
							value={formData.txtPrefix}
							onInput={(e: any) => handleInputChange("txtPrefix", e.target.value)}
							style={{ width: "100%" }}
						/>
					</div>

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Ciphers
						</label>
						<VSCodeTextField
							value={formData.txtCipers}
							onInput={(e: any) => handleInputChange("txtCipers", e.target.value)}
							style={{ width: "100%" }}
							placeholder="20"
						/>
					</div>

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Fill Character
						</label>
						<VSCodeTextField
							value={formData.txtFillChar}
							onInput={(e: any) => handleInputChange("txtFillChar", e.target.value)}
							style={{ width: "100%" }}
						/>
					</div>
				</div>
			)}
		</>
	)

	const renderSequenceIdForm = () => (
		<>
			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					ID Service Name *
				</label>
				<VSCodeTextField
					value={formData.txtIdServiceName || "sequenceIdGnrService"}
					onInput={(e: any) => handleInputChange("txtIdServiceName", e.target.value)}
					style={{ width: "100%", borderColor: errors.txtIdServiceName ? "var(--vscode-errorForeground)" : undefined }}
				/>
				{errors.txtIdServiceName && (
					<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
						{errors.txtIdServiceName}
					</div>
				)}
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Datasource Name *
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
					Query *
				</label>
				<VSCodeTextField
					value={formData.txtQuery}
					onInput={(e: any) => handleInputChange("txtQuery", e.target.value)}
					style={{ width: "100%", borderColor: errors.txtQuery ? "var(--vscode-errorForeground)" : undefined }}
					placeholder="SELECT NEXTVAL('seq_name')"
				/>
				{errors.txtQuery && (
					<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
						{errors.txtQuery}
					</div>
				)}
			</div>
		</>
	)

	const renderUuidForm = () => (
		<>
			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					ID Service Name *
				</label>
				<VSCodeTextField
					value={formData.txtIdServiceName || "uuidIdGnrService"}
					onInput={(e: any) => handleInputChange("txtIdServiceName", e.target.value)}
					style={{ width: "100%", borderColor: errors.txtIdServiceName ? "var(--vscode-errorForeground)" : undefined }}
				/>
				{errors.txtIdServiceName && (
					<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
						{errors.txtIdServiceName}
					</div>
				)}
			</div>
		</>
	)

	return (
		<div style={{ padding: "20px", maxWidth: "800px" }}>
			<h3 style={{ color: "var(--vscode-foreground)", marginTop: 0, marginBottom: "20px" }}>
				Create {idType.charAt(0).toUpperCase() + idType.slice(1)} ID Generation
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
			
			{idType === "table" && renderTableIdForm()}
			{idType === "sequence" && renderSequenceIdForm()}
			{idType === "uuid" && renderUuidForm()}

			<div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
				<VSCodeButton appearance="secondary" onClick={onCancel}>
					Cancel
				</VSCodeButton>
				<VSCodeButton appearance="primary" onClick={handleSubmit}>
					Generate
				</VSCodeButton>
			</div>
		</div>
	)
}

export default IdGenerationForm 