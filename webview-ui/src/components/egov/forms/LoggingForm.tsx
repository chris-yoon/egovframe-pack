import React, { useState } from "react"
import { VSCodeButton, VSCodeTextField, VSCodeDropdown, VSCodeOption, VSCodeRadioGroup, VSCodeRadio } from "@vscode/webview-ui-toolkit/react"
import { ConfigFormData, ConfigGenerationType } from "../types/templates"
import { useVSCode } from '../../../context/VSCodeContext'

interface LoggingFormProps {
	loggingType: "console" | "file" | "rollingFile" | "jdbc"
	onSubmit: (formData: ConfigFormData) => void
	onCancel: () => void
}

const LoggingForm: React.FC<LoggingFormProps> = ({ loggingType, onSubmit, onCancel }) => {
	const { vscode, isReady } = useVSCode()
	
	const getDefaultFileName = (type: ConfigGenerationType) => {
		switch (type) {
			case ConfigGenerationType.XML:
				return `logback-${loggingType}`
			case ConfigGenerationType.YAML:
				return `application`
			case ConfigGenerationType.PROPERTIES:
				return `logback`
			default:
				return `logback-${loggingType}`
		}
	}
	
	const [formData, setFormData] = useState<ConfigFormData>({
		generationType: ConfigGenerationType.XML,
		txtFileName: getDefaultFileName(ConfigGenerationType.XML),
		txtAppenderName: `${loggingType}Appender`,
		txtLevel: "INFO",
		txtPattern: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n",
		txtLoggerName: "egovframework",
		txtLoggerLevel: "DEBUG",
		txtLogFileName: (loggingType === "file" || loggingType === "rollingFile") ? "/logs/egovframework.log" : undefined,
		// JDBC specific fields
		txtDataSourceRef: loggingType === "jdbc" ? "dataSource" : undefined,
		txtTableName: loggingType === "jdbc" ? "SYSTEM_LOG" : undefined,
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

	const handleGenerationTypeChange = (type: ConfigGenerationType) => {
		setFormData(prev => ({
			...prev,
			generationType: type,
			txtFileName: getDefaultFileName(type)
		}))
	}

	const validateForm = (): boolean => {
		const newErrors: {[key: string]: string} = {}

		// Required fields validation
		if (!formData.txtFileName?.trim()) {
			newErrors.txtFileName = "File name is required"
		}
		if (!formData.txtAppenderName?.trim()) {
			newErrors.txtAppenderName = "Appender name is required"
		}
		if (!formData.txtPattern?.trim()) {
			newErrors.txtPattern = "Pattern is required"
		}
		if (!formData.txtLoggerName?.trim()) {
			newErrors.txtLoggerName = "Logger name is required"
		}

		// Type-specific validations
		if ((loggingType === "file" || loggingType === "rollingFile") && !formData.txtLogFileName?.trim()) {
			newErrors.txtLogFileName = "Log file name is required"
		}
		if (loggingType === "jdbc") {
			if (!formData.txtDataSourceRef?.trim()) {
				newErrors.txtDataSourceRef = "DataSource reference is required"
			}
			if (!formData.txtTableName?.trim()) {
				newErrors.txtTableName = "Table name is required"
			}
		}

		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	const handleSubmit = async () => {
		if (validateForm()) {
			console.log("🚀 LoggingForm: handleSubmit called with VSCode ready:", isReady)
			
			if (vscode && isReady) {
				try {
					console.log("✅ LoggingForm: Sending selectFolderAndGenerate message")
					vscode.postMessage({
						type: 'selectFolderAndGenerate',
						formData: formData,
						templateType: 'logging'
					})
					console.log("✅ LoggingForm: Message sent successfully")
				} catch (error) {
					console.error('❌ LoggingForm: Error sending message:', error)
					// Fallback to parent handler
					onSubmit(formData)
				}
			} else {
				console.warn("⚠️ LoggingForm: VSCode API not ready, using fallback")
				onSubmit(formData)
			}
		}
	}

	return (
		<div style={{ padding: "20px", maxWidth: "800px" }}>
			<h3 style={{ color: "var(--vscode-foreground)", marginTop: 0, marginBottom: "20px" }}>
				Configure {loggingType.charAt(0).toUpperCase() + loggingType.slice(1)} Logging
			</h3>
			
			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Generation Type *
				</label>
				<VSCodeRadioGroup
					value={formData.generationType}
					onChange={(e: any) => handleGenerationTypeChange(e.target.value as ConfigGenerationType)}>
					<VSCodeRadio value={ConfigGenerationType.XML}>XML</VSCodeRadio>
					<VSCodeRadio value={ConfigGenerationType.YAML}>YAML</VSCodeRadio>
					<VSCodeRadio value={ConfigGenerationType.PROPERTIES}>Properties</VSCodeRadio>
				</VSCodeRadioGroup>
			</div>

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

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Appender Name *
				</label>
				<VSCodeTextField
					value={formData.txtAppenderName}
					onInput={(e: any) => handleInputChange("txtAppenderName", e.target.value)}
					style={{ width: "100%", borderColor: errors.txtAppenderName ? "var(--vscode-errorForeground)" : undefined }}
				/>
				{errors.txtAppenderName && (
					<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
						{errors.txtAppenderName}
					</div>
				)}
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Log Level
				</label>
				<VSCodeDropdown
					value={formData.txtLevel}
					onInput={(e: any) => handleInputChange("txtLevel", e.target.value)}
					style={{ width: "100%" }}>
					<VSCodeOption value="TRACE">TRACE</VSCodeOption>
					<VSCodeOption value="DEBUG">DEBUG</VSCodeOption>
					<VSCodeOption value="INFO">INFO</VSCodeOption>
					<VSCodeOption value="WARN">WARN</VSCodeOption>
					<VSCodeOption value="ERROR">ERROR</VSCodeOption>
				</VSCodeDropdown>
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Pattern *
				</label>
				<VSCodeTextField
					value={formData.txtPattern}
					onInput={(e: any) => handleInputChange("txtPattern", e.target.value)}
					style={{ width: "100%", borderColor: errors.txtPattern ? "var(--vscode-errorForeground)" : undefined }}
				/>
				{errors.txtPattern && (
					<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
						{errors.txtPattern}
					</div>
				)}
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Logger Name *
				</label>
				<VSCodeTextField
					value={formData.txtLoggerName}
					onInput={(e: any) => handleInputChange("txtLoggerName", e.target.value)}
					style={{ width: "100%", borderColor: errors.txtLoggerName ? "var(--vscode-errorForeground)" : undefined }}
				/>
				{errors.txtLoggerName && (
					<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
						{errors.txtLoggerName}
					</div>
				)}
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Logger Level
				</label>
				<VSCodeDropdown
					value={formData.txtLoggerLevel}
					onInput={(e: any) => handleInputChange("txtLoggerLevel", e.target.value)}
					style={{ width: "100%" }}>
					<VSCodeOption value="TRACE">TRACE</VSCodeOption>
					<VSCodeOption value="DEBUG">DEBUG</VSCodeOption>
					<VSCodeOption value="INFO">INFO</VSCodeOption>
					<VSCodeOption value="WARN">WARN</VSCodeOption>
					<VSCodeOption value="ERROR">ERROR</VSCodeOption>
				</VSCodeDropdown>
			</div>

			{(loggingType === "file" || loggingType === "rollingFile") && (
				<div style={{ marginBottom: "15px" }}>
					<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
						Log File Name *
					</label>
					<VSCodeTextField
						value={formData.txtLogFileName || ""}
						onInput={(e: any) => handleInputChange("txtLogFileName", e.target.value)}
						style={{ width: "100%", borderColor: errors.txtLogFileName ? "var(--vscode-errorForeground)" : undefined }}
					/>
					{errors.txtLogFileName && (
						<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
							{errors.txtLogFileName}
						</div>
					)}
				</div>
			)}

			{loggingType === "jdbc" && (
				<>
					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							DataSource Reference *
						</label>
						<VSCodeTextField
							value={formData.txtDataSourceRef || ""}
							onInput={(e: any) => handleInputChange("txtDataSourceRef", e.target.value)}
							style={{ width: "100%", borderColor: errors.txtDataSourceRef ? "var(--vscode-errorForeground)" : undefined }}
							placeholder="dataSource"
						/>
						{errors.txtDataSourceRef && (
							<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
								{errors.txtDataSourceRef}
							</div>
						)}
					</div>

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Table Name *
						</label>
						<VSCodeTextField
							value={formData.txtTableName || ""}
							onInput={(e: any) => handleInputChange("txtTableName", e.target.value)}
							style={{ width: "100%", borderColor: errors.txtTableName ? "var(--vscode-errorForeground)" : undefined }}
							placeholder="SYSTEM_LOG"
						/>
						{errors.txtTableName && (
							<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
								{errors.txtTableName}
							</div>
						)}
					</div>
				</>
			)}

			<div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
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

export default LoggingForm 