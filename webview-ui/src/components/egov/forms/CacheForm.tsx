import React, { useState } from "react"
import { VSCodeButton, VSCodeTextField, VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import { ConfigFormData, ConfigGenerationType, FormComponentProps } from "../types/templates"
import { vscode } from "../utils/vscode"

const CacheForm: React.FC<FormComponentProps> = ({ template, onSubmit, onCancel, initialData }) => {
	const [currentPage, setCurrentPage] = useState<1 | 2>(1)
	const [formData, setFormData] = useState<ConfigFormData>({
		generationType: ConfigGenerationType.XML,
		txtFileName: "ehcache-default",
		// Default Cache Settings
		txtDiskStore: "user.dir/second",
		txtDftMaxElements: "10000",
		txtDftEternal: "false",
		txtDftIdelTime: "120",
		txtDftLiveTime: "120",
		txtDftOverfow: "true",
		txtDftDiskPersistence: "true",
		txtDftDiskExpiry: "120",
		// Custom Cache Settings
		txtCacheName: "",
		txtMaxElements: "100",
		txtEternal: "false",
		txtIdleTime: "360",
		txtLiveTime: "1000",
		txtOverflowToDisk: "false",
		txtDiskPersistent: "false",
		cboMemoryPolicy: "LRU",
		...initialData
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
		if (!formData.txtDiskStore?.trim()) {
			newErrors.txtDiskStore = "Disk store path is required"
		}
		// Page 2 validation only when on page 2
		if (currentPage === 2 && formData.txtCacheName?.trim() === "") {
			newErrors.txtCacheName = "Cache name is required"
		}

		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	const handleGenerationTypeChange = (value: ConfigGenerationType) => {
		setFormData(prev => ({
			...prev,
			generationType: value,
			txtFileName: value === ConfigGenerationType.XML ? "context-ehcache" : "EgovEhcacheConfig"
		}))
	}

	const handleSubmit = () => {
		if (validateForm()) {
			// Open folder selection dialog via VSCode API
			if (vscode) {
				vscode.postMessage({
					type: 'selectFolderAndGenerate',
					formData: formData,
					templateType: 'cache'
				})
			} else {
				console.error('VSCode API not available')
			}
		}
	}

	const renderPage1 = () => (
		<div>
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
					Disk Store Path *
				</label>
				<VSCodeTextField
					value={formData.txtDiskStore}
					onInput={(e: any) => handleInputChange("txtDiskStore", e.target.value)}
					style={{ width: "100%", borderColor: errors.txtDiskStore ? "var(--vscode-errorForeground)" : undefined }}
				/>
				{errors.txtDiskStore && (
					<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
						{errors.txtDiskStore}
					</div>
				)}
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Default Cache Max Elements
				</label>
				<VSCodeTextField
					value={formData.txtDftMaxElements}
					onInput={(e: any) => handleInputChange("txtDftMaxElements", e.target.value)}
					style={{ width: "100%" }}
				/>
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Default Cache Eternal
				</label>
				<VSCodeDropdown
					value={formData.txtDftEternal}
					onInput={(e: any) => handleInputChange("txtDftEternal", e.target.value)}
					style={{ width: "100%" }}>
					<VSCodeOption value="true">True</VSCodeOption>
					<VSCodeOption value="false">False</VSCodeOption>
				</VSCodeDropdown>
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Default Cache Idle Time (sec)
				</label>
				<VSCodeTextField
					value={formData.txtDftIdelTime}
					onInput={(e: any) => handleInputChange("txtDftIdelTime", e.target.value)}
					style={{ width: "100%" }}
				/>
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Default Cache Live Time (sec)
				</label>
				<VSCodeTextField
					value={formData.txtDftLiveTime}
					onInput={(e: any) => handleInputChange("txtDftLiveTime", e.target.value)}
					style={{ width: "100%" }}
				/>
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Default Cache Overflow to Disk
				</label>
				<VSCodeDropdown
					value={formData.txtDftOverfow}
					onInput={(e: any) => handleInputChange("txtDftOverfow", e.target.value)}
					style={{ width: "100%" }}>
					<VSCodeOption value="true">True</VSCodeOption>
					<VSCodeOption value="false">False</VSCodeOption>
				</VSCodeDropdown>
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Default Cache Disk Persistent
				</label>
				<VSCodeDropdown
					value={formData.txtDftDiskPersistence}
					onInput={(e: any) => handleInputChange("txtDftDiskPersistence", e.target.value)}
					style={{ width: "100%" }}>
					<VSCodeOption value="true">True</VSCodeOption>
					<VSCodeOption value="false">False</VSCodeOption>
				</VSCodeDropdown>
			</div>

			<div style={{ marginBottom: "20px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Default Cache Disk Expiry (sec)
				</label>
				<VSCodeTextField
					value={formData.txtDftDiskExpiry}
					onInput={(e: any) => handleInputChange("txtDftDiskExpiry", e.target.value)}
					style={{ width: "100%" }}
				/>
			</div>

			<div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
				<VSCodeButton appearance="secondary" onClick={onCancel}>
					Cancel
				</VSCodeButton>
				<VSCodeButton appearance="primary" onClick={() => setCurrentPage(2)}>
					Next
				</VSCodeButton>
			</div>
		</div>
	)

	const renderPage2 = () => (
		<div>
			<h4 style={{ color: "var(--vscode-foreground)", marginBottom: "10px" }}>Set Custom Cache</h4>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Cache Name *
				</label>
				<VSCodeTextField
					value={formData.txtCacheName}
					onInput={(e: any) => handleInputChange("txtCacheName", e.target.value)}
					style={{ width: "100%", borderColor: errors.txtCacheName ? "var(--vscode-errorForeground)" : undefined }}
					placeholder="Enter cache name"
				/>
				{errors.txtCacheName && (
					<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
						{errors.txtCacheName}
					</div>
				)}
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Max Elements
				</label>
				<VSCodeTextField
					value={formData.txtMaxElements}
					onInput={(e: any) => handleInputChange("txtMaxElements", e.target.value)}
					style={{ width: "100%" }}
				/>
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Eternal
				</label>
				<VSCodeDropdown
					value={formData.txtEternal}
					onInput={(e: any) => handleInputChange("txtEternal", e.target.value)}
					style={{ width: "100%" }}>
					<VSCodeOption value="true">True</VSCodeOption>
					<VSCodeOption value="false">False</VSCodeOption>
				</VSCodeDropdown>
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Idle Time (sec)
				</label>
				<VSCodeTextField
					value={formData.txtIdleTime}
					onInput={(e: any) => handleInputChange("txtIdleTime", e.target.value)}
					style={{ width: "100%" }}
				/>
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Live Time (sec)
				</label>
				<VSCodeTextField
					value={formData.txtLiveTime}
					onInput={(e: any) => handleInputChange("txtLiveTime", e.target.value)}
					style={{ width: "100%" }}
				/>
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Overflow to Disk
				</label>
				<VSCodeDropdown
					value={formData.txtOverflowToDisk}
					onInput={(e: any) => handleInputChange("txtOverflowToDisk", e.target.value)}
					style={{ width: "100%" }}>
					<VSCodeOption value="true">True</VSCodeOption>
					<VSCodeOption value="false">False</VSCodeOption>
				</VSCodeDropdown>
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Disk Persistent
				</label>
				<VSCodeDropdown
					value={formData.txtDiskPersistent}
					onInput={(e: any) => handleInputChange("txtDiskPersistent", e.target.value)}
					style={{ width: "100%" }}>
					<VSCodeOption value="true">True</VSCodeOption>
					<VSCodeOption value="false">False</VSCodeOption>
				</VSCodeDropdown>
			</div>

			<div style={{ marginBottom: "20px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Memory Store Eviction Policy
				</label>
				<VSCodeDropdown
					value={formData.cboMemoryPolicy}
					onInput={(e: any) => handleInputChange("cboMemoryPolicy", e.target.value)}
					style={{ width: "100%" }}>
					<VSCodeOption value="LRU">LRU</VSCodeOption>
					<VSCodeOption value="FIFO">FIFO</VSCodeOption>
					<VSCodeOption value="LFU">LFU</VSCodeOption>
				</VSCodeDropdown>
			</div>

			<div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
				<VSCodeButton appearance="secondary" onClick={() => setCurrentPage(1)}>
					Previous
				</VSCodeButton>
				<VSCodeButton appearance="primary" onClick={handleSubmit}>
					Generate
				</VSCodeButton>
			</div>
		</div>
	)

	return (
		<div style={{ padding: "20px", maxWidth: "800px" }}>
			<h3 style={{ color: "var(--vscode-foreground)", marginTop: 0, marginBottom: "20px" }}>
				Set Default Cache
			</h3>
			
			{currentPage === 1 ? renderPage1() : renderPage2()}
		</div>
	)
}

export default CacheForm 