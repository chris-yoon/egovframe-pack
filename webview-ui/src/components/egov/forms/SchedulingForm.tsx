import React, { useState } from "react"
import { VSCodeButton, VSCodeTextField, VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import { ConfigFormData, ConfigGenerationType } from "../types/templates"
import { useVSCode } from '../../../context/VSCodeContext'

interface SchedulingFormProps {
	schedulingType: "scheduler" | "beanJob" | "cronTrigger" | "simpleTrigger" | "methodJob"
	onSubmit: (formData: ConfigFormData) => void
	onCancel: () => void
}

const SchedulingForm: React.FC<SchedulingFormProps> = ({ schedulingType, onSubmit, onCancel }) => {
	const { vscode, isReady } = useVSCode()
	
	const getDefaultFileName = (type: string, generationType: ConfigGenerationType) => {
		if (generationType === ConfigGenerationType.XML) {
			return "context-scheduling"
		} else {
			return "EgovSchedulingConfig"
		}
	}

	const [formData, setFormData] = useState<ConfigFormData>({
		generationType: ConfigGenerationType.XML,
		txtFileName: getDefaultFileName(schedulingType, ConfigGenerationType.XML),
		
		// Scheduler specific
		txtSchedulerName: "schedulerFactory",
		txtTriggerName: "triggerName",
		cboTriggerType: "SimpleTriggerFactoryBean",
		
		// Job specific
		txtJobName: "jobDetail",
		txtServiceClass: "",
		chkProperty: true,
		txtPropertyName: "paramSampleJob",
		txtPropertyValue: "SampleJobValue",
		
		// Trigger specific
		txtGroup: "group1",
		txtJobGroup: "jobGroup1",
		txtCronExpression: "0 0 6 * * ?", // Daily at 6 AM
		txtRepeatInterval: "10000",
		txtRepeatCount: "-1",
		
		// Method Job specific
		txtTargetObject: "",
		txtTargetMethod: ""
	})

	const [errors, setErrors] = useState<{[key: string]: string}>({})

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

	const handleGenerationTypeChange = (value: ConfigGenerationType) => {
		setFormData(prev => ({
			...prev,
			generationType: value,
			txtFileName: getDefaultFileName(schedulingType, value)
		}))
	}

	const validateForm = (): boolean => {
		const newErrors: {[key: string]: string} = {}

		// Required fields validation
		if (!formData.txtFileName?.trim()) {
			newErrors.txtFileName = "File name is required"
		}

		// Type-specific validations
		if (schedulingType === "scheduler") {
			if (!formData.txtSchedulerName?.trim()) {
				newErrors.txtSchedulerName = "Scheduler name is required"
			}
			if (!formData.txtTriggerName?.trim()) {
				newErrors.txtTriggerName = "Trigger name is required"
			}
		}

		if (schedulingType === "beanJob" || schedulingType === "methodJob") {
			if (!formData.txtJobName?.trim()) {
				newErrors.txtJobName = "Job name is required"
			}
			if (schedulingType === "beanJob" && !formData.txtServiceClass?.trim()) {
				newErrors.txtServiceClass = "Service class is required"
			}
			if (schedulingType === "methodJob") {
				if (!formData.txtTargetObject?.trim()) {
					newErrors.txtTargetObject = "Target object is required"
				}
				if (!formData.txtTargetMethod?.trim()) {
					newErrors.txtTargetMethod = "Target method is required"
				}
			}
		}

		if (schedulingType === "cronTrigger") {
			if (!formData.txtTriggerName?.trim()) {
				newErrors.txtTriggerName = "Trigger name is required"
			}
			if (!formData.txtCronExpression?.trim()) {
				newErrors.txtCronExpression = "Cron expression is required"
			}
		}

		if (schedulingType === "simpleTrigger") {
			if (!formData.txtTriggerName?.trim()) {
				newErrors.txtTriggerName = "Trigger name is required"
			}
			if (!formData.txtRepeatInterval?.trim()) {
				newErrors.txtRepeatInterval = "Repeat interval is required"
			}
		}

		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	const handleSubmit = async () => {
		if (validateForm()) {
			console.log(`🚀 SchedulingForm (${schedulingType}): handleSubmit called with VSCode ready:`, isReady)
			
			if (vscode && isReady) {
				try {
					console.log(`✅ SchedulingForm (${schedulingType}): Sending selectFolderAndGenerate message`)
					vscode.postMessage({
						type: 'selectFolderAndGenerate',
						formData: formData,
						templateType: `scheduling-${schedulingType}`
					})
					console.log(`✅ SchedulingForm (${schedulingType}): Message sent successfully`)
				} catch (error) {
					console.error(`❌ SchedulingForm (${schedulingType}): Error sending message:`, error)
					// Fallback to parent handler
					onSubmit(formData)
				}
			} else {
				console.warn(`⚠️ SchedulingForm (${schedulingType}): VSCode API not ready, using fallback`)
				onSubmit(formData)
			}
		}
	}

	const getTitle = () => {
		switch (schedulingType) {
			case "scheduler": return "Create Scheduler"
			case "beanJob": return "Create Detail Bean Job"
			case "cronTrigger": return "Create Cron Trigger"
			case "simpleTrigger": return "Create Simple Trigger"
			case "methodJob": return "Create Method Job"
			default: return "Create Scheduling Configuration"
		}
	}

	return (
		<div style={{ padding: "20px", maxWidth: "800px" }}>
			<h3 style={{ color: "var(--vscode-foreground)", marginTop: 0, marginBottom: "20px" }}>
				{getTitle()}
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

			{/* Scheduler specific fields */}
			{schedulingType === "scheduler" && (
				<>
					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							TriggerFactoryBean Type
						</label>
						<VSCodeDropdown
							value={formData.cboTriggerType}
							onInput={(e: any) => handleInputChange("cboTriggerType", e.target.value)}
							style={{ width: "100%" }}>
							<VSCodeOption value="SimpleTriggerFactoryBean">SimpleTriggerFactoryBean</VSCodeOption>
							<VSCodeOption value="CronTriggerFactoryBean">CronTriggerFactoryBean</VSCodeOption>
						</VSCodeDropdown>
					</div>

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Scheduler Name *
						</label>
						<VSCodeTextField
							value={formData.txtSchedulerName}
							onInput={(e: any) => handleInputChange("txtSchedulerName", e.target.value)}
							style={{ width: "100%", borderColor: errors.txtSchedulerName ? "var(--vscode-errorForeground)" : undefined }}
						/>
						{errors.txtSchedulerName && (
							<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
								{errors.txtSchedulerName}
							</div>
						)}
					</div>

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Trigger Name *
						</label>
						<VSCodeTextField
							value={formData.txtTriggerName}
							onInput={(e: any) => handleInputChange("txtTriggerName", e.target.value)}
							style={{ width: "100%", borderColor: errors.txtTriggerName ? "var(--vscode-errorForeground)" : undefined }}
						/>
						{errors.txtTriggerName && (
							<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
								{errors.txtTriggerName}
							</div>
						)}
					</div>
				</>
			)}

			{/* Job specific fields */}
			{(schedulingType === "beanJob" || schedulingType === "methodJob") && (
				<>
					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Job Name *
						</label>
						<VSCodeTextField
							value={formData.txtJobName}
							onInput={(e: any) => handleInputChange("txtJobName", e.target.value)}
							style={{ width: "100%", borderColor: errors.txtJobName ? "var(--vscode-errorForeground)" : undefined }}
						/>
						{errors.txtJobName && (
							<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
								{errors.txtJobName}
							</div>
						)}
					</div>

					{schedulingType === "beanJob" && (
						<div style={{ marginBottom: "15px" }}>
							<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
								Job Class *
							</label>
							<VSCodeTextField
								value={formData.txtServiceClass}
								onInput={(e: any) => handleInputChange("txtServiceClass", e.target.value)}
								placeholder="Enter service class name"
								style={{ width: "100%", borderColor: errors.txtServiceClass ? "var(--vscode-errorForeground)" : undefined }}
							/>
							{errors.txtServiceClass && (
								<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
									{errors.txtServiceClass}
								</div>
							)}
						</div>
					)}

					{schedulingType === "methodJob" && (
						<>
							<div style={{ marginBottom: "15px" }}>
								<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
									Target Object *
								</label>
								<VSCodeTextField
									value={formData.txtTargetObject}
									onInput={(e: any) => handleInputChange("txtTargetObject", e.target.value)}
									placeholder="Enter target object name"
									style={{ width: "100%", borderColor: errors.txtTargetObject ? "var(--vscode-errorForeground)" : undefined }}
								/>
								{errors.txtTargetObject && (
									<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
										{errors.txtTargetObject}
									</div>
								)}
							</div>

							<div style={{ marginBottom: "15px" }}>
								<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
									Target Method *
								</label>
								<VSCodeTextField
									value={formData.txtTargetMethod}
									onInput={(e: any) => handleInputChange("txtTargetMethod", e.target.value)}
									placeholder="Enter target method name"
									style={{ width: "100%", borderColor: errors.txtTargetMethod ? "var(--vscode-errorForeground)" : undefined }}
								/>
								{errors.txtTargetMethod && (
									<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
										{errors.txtTargetMethod}
									</div>
								)}
							</div>
						</>
					)}

					{/* Property section */}
					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "flex", alignItems: "center", color: "var(--vscode-foreground)" }}>
							<input
								type="checkbox"
								checked={formData.chkProperty || false}
								onChange={(e) => handleInputChange("chkProperty", e.target.checked)}
								style={{ marginRight: "8px" }}
							/>
							Add Property
						</label>
					</div>

					{formData.chkProperty && (
						<div style={{ marginLeft: "20px" }}>
							<div style={{ marginBottom: "15px" }}>
								<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
									Property Name
								</label>
								<VSCodeTextField
									value={formData.txtPropertyName}
									onInput={(e: any) => handleInputChange("txtPropertyName", e.target.value)}
									style={{ width: "100%" }}
								/>
							</div>

							<div style={{ marginBottom: "15px" }}>
								<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
									Property Value
								</label>
								<VSCodeTextField
									value={formData.txtPropertyValue}
									onInput={(e: any) => handleInputChange("txtPropertyValue", e.target.value)}
									style={{ width: "100%" }}
								/>
							</div>
						</div>
					)}
				</>
			)}

			{/* Trigger specific fields */}
			{(schedulingType === "cronTrigger" || schedulingType === "simpleTrigger") && (
				<>
					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Trigger Name *
						</label>
						<VSCodeTextField
							value={formData.txtTriggerName}
							onInput={(e: any) => handleInputChange("txtTriggerName", e.target.value)}
							style={{ width: "100%", borderColor: errors.txtTriggerName ? "var(--vscode-errorForeground)" : undefined }}
						/>
						{errors.txtTriggerName && (
							<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
								{errors.txtTriggerName}
							</div>
						)}
					</div>

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Group
						</label>
						<VSCodeTextField
							value={formData.txtGroup}
							onInput={(e: any) => handleInputChange("txtGroup", e.target.value)}
							style={{ width: "100%" }}
						/>
					</div>

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Job Group
						</label>
						<VSCodeTextField
							value={formData.txtJobGroup}
							onInput={(e: any) => handleInputChange("txtJobGroup", e.target.value)}
							style={{ width: "100%" }}
						/>
					</div>

					{schedulingType === "cronTrigger" && (
						<div style={{ marginBottom: "15px" }}>
							<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
								Cron Expression *
							</label>
							<VSCodeTextField
								value={formData.txtCronExpression}
								onInput={(e: any) => handleInputChange("txtCronExpression", e.target.value)}
								placeholder="0 0 6 * * ?"
								style={{ width: "100%", borderColor: errors.txtCronExpression ? "var(--vscode-errorForeground)" : undefined }}
							/>
							{errors.txtCronExpression && (
								<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
									{errors.txtCronExpression}
								</div>
							)}
							<div style={{ fontSize: "11px", color: "var(--vscode-descriptionForeground)", marginTop: "4px" }}>
								Example: "0 0 6 * * ?" (Daily at 6 AM)
							</div>
						</div>
					)}

					{schedulingType === "simpleTrigger" && (
						<>
							<div style={{ marginBottom: "15px" }}>
								<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
									Repeat Interval (ms) *
								</label>
								<VSCodeTextField
									value={formData.txtRepeatInterval}
									onInput={(e: any) => handleInputChange("txtRepeatInterval", e.target.value)}
									placeholder="10000"
									style={{ width: "100%", borderColor: errors.txtRepeatInterval ? "var(--vscode-errorForeground)" : undefined }}
								/>
								{errors.txtRepeatInterval && (
									<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
										{errors.txtRepeatInterval}
									</div>
								)}
							</div>

							<div style={{ marginBottom: "15px" }}>
								<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
									Repeat Count
								</label>
								<VSCodeTextField
									value={formData.txtRepeatCount}
									onInput={(e: any) => handleInputChange("txtRepeatCount", e.target.value)}
									placeholder="-1 for infinite"
									style={{ width: "100%" }}
								/>
								<div style={{ fontSize: "11px", color: "var(--vscode-descriptionForeground)", marginTop: "4px" }}>
									Use -1 for infinite repetition
								</div>
							</div>
						</>
					)}
				</>
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

export default SchedulingForm 