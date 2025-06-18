import React, { useState } from "react"
import { VSCodeButton, VSCodeTextField, VSCodeDropdown, VSCodeOption, VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react"
import { ConfigFormData, ConfigGenerationType } from "../types/templates"
import { useVSCode } from '../../../context/VSCodeContext'

interface TransactionFormProps {
	transactionType: "datasource" | "jpa" | "jta"
	onSubmit: (formData: ConfigFormData) => void
	onCancel: () => void
}

const TransactionForm: React.FC<TransactionFormProps> = ({ transactionType, onSubmit, onCancel }) => {
	const { vscode, isReady } = useVSCode()
	
	const getDefaultFileName = (type: string, generationType: ConfigGenerationType) => {
		if (generationType === ConfigGenerationType.XML) {
			switch (type) {
				case "jpa": return "context-transaction-jpa"
				case "jta": return "context-transaction-jta"
				default: return "context-transaction"
			}
		} else {
			switch (type) {
				case "jpa": return "EgovJpaTransactionConfig"
				case "jta": return "EgovJtaTransactionConfig"
				default: return "EgovTransactionConfig"
			}
		}
	}

	const [formData, setFormData] = useState<ConfigFormData>({
		generationType: ConfigGenerationType.XML,
		txtFileName: getDefaultFileName(transactionType, ConfigGenerationType.XML),
		txtTransactionName: transactionType === "jpa" ? "transactionManager" : "txManager",
		txtDataSourceName: "dataSource",
		
		// JPA specific
		txtEttMgrFactory: "entityManagerFactory",
		txtEntityPackages: "",
		cmbDialect: "",
		txtRepositoryPackage: "",
		
		// JTA specific
		txtJtaManager: "jtaManager",
		txtJtaUserTransaction: "userTransaction",
		
		// Common transaction settings
		chkTransactionTemplate: false,
		txtTransactionTemplateName: "transactionTemplate",
		chkAnnotationTransactionManagement: false,
		chkConfigurationalTransactionManagement: true,
		txtPointCutName: "requiredTx",
		txtPointCutExpression: transactionType === "jpa" 
			? "execution(* egovframework.sample..*Impl.*(..))"
			: "execution(* egovframework.com..*Impl.*(..)) or execution(* org.egovframe.rte.fdl.excel.impl.*Impl.*(..))",
		txtAdviceName: "txAdvice",
		txtMethodName: "*",
		chkReadOnly: false,
		chkRollbackFor: true,
		txtRollbackFor: "Exception",
		chkNoRollbackFor: false,
		txtNoRollbackFor: "RuntimeException",
		chkTimeout: false,
		txtTimeout: "20",
		cmbPropagation: "REQUIRED",
		cmbIsolation: "DEFAULT"
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
			txtFileName: getDefaultFileName(transactionType, value)
		}))
	}

	const validateForm = (): boolean => {
		const newErrors: {[key: string]: string} = {}

		// Required fields validation
		if (!formData.txtFileName?.trim()) {
			newErrors.txtFileName = "File name is required"
		}
		if (!formData.txtTransactionName?.trim()) {
			newErrors.txtTransactionName = "Transaction manager name is required"
		}
		if (!formData.txtDataSourceName?.trim()) {
			newErrors.txtDataSourceName = "Datasource name is required"
		}

		// JPA specific validations
		if (transactionType === "jpa") {
			if (!formData.txtEttMgrFactory?.trim()) {
				newErrors.txtEttMgrFactory = "Entity manager factory name is required"
			}
			if (!formData.txtEntityPackages?.trim()) {
				newErrors.txtEntityPackages = "Entity packages is required"
			}
			if (!formData.cmbDialect?.trim()) {
				newErrors.cmbDialect = "Dialect is required"
			}
			if (!formData.txtRepositoryPackage?.trim()) {
				newErrors.txtRepositoryPackage = "Repository package is required"
			}
		}

		// JTA specific validations
		if (transactionType === "jta") {
			if (!formData.txtJtaManager?.trim()) {
				newErrors.txtJtaManager = "JTA manager is required"
			}
			if (!formData.txtJtaUserTransaction?.trim()) {
				newErrors.txtJtaUserTransaction = "JTA user transaction is required"
			}
		}

		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	const handleSubmit = async () => {
		if (validateForm()) {
			console.log(`🚀 TransactionForm (${transactionType}): handleSubmit called with VSCode ready:`, isReady)
			
			if (vscode && isReady) {
				try {
					console.log(`✅ TransactionForm (${transactionType}): Sending selectFolderAndGenerate message`)
					vscode.postMessage({
						type: 'selectFolderAndGenerate',
						formData: formData,
						templateType: `transaction-${transactionType}`
					})
					console.log(`✅ TransactionForm (${transactionType}): Message sent successfully`)
				} catch (error) {
					console.error(`❌ TransactionForm (${transactionType}): Error sending message:`, error)
					// Fallback to parent handler
					onSubmit(formData)
				}
			} else {
				console.warn(`⚠️ TransactionForm (${transactionType}): VSCode API not ready, using fallback`)
				onSubmit(formData)
			}
		}
	}

	const dialectOptions = [
		{ group: "H2", options: [
			{ value: "org.hibernate.dialect.H2Dialect", label: "H2 Dialect" }
		]},
		{ group: "MySQL", options: [
			{ value: "org.hibernate.dialect.MySQL5Dialect", label: "MySQL 5 Dialect" },
			{ value: "org.hibernate.dialect.MySQL5InnoDBDialect", label: "MySQL 5 InnoDB Dialect" },
			{ value: "org.hibernate.dialect.MySQL8Dialect", label: "MySQL 8 Dialect" }
		]},
		{ group: "PostgreSQL", options: [
			{ value: "org.hibernate.dialect.PostgreSQL9Dialect", label: "PostgreSQL 9 Dialect" },
			{ value: "org.hibernate.dialect.PostgreSQL10Dialect", label: "PostgreSQL 10 Dialect" },
			{ value: "org.hibernate.dialect.PostgreSQL11Dialect", label: "PostgreSQL 11 Dialect" },
			{ value: "org.hibernate.dialect.PostgreSQL12Dialect", label: "PostgreSQL 12 Dialect" }
		]},
		{ group: "Oracle", options: [
			{ value: "org.hibernate.dialect.Oracle10gDialect", label: "Oracle 10g Dialect" },
			{ value: "org.hibernate.dialect.Oracle11gDialect", label: "Oracle 11g Dialect" },
			{ value: "org.hibernate.dialect.Oracle12cDialect", label: "Oracle 12c Dialect" },
			{ value: "org.hibernate.dialect.Oracle21cDialect", label: "Oracle 21c Dialect" }
		]}
	]

	return (
		<div style={{ padding: "20px", maxWidth: "800px" }}>
			<h3 style={{ color: "var(--vscode-foreground)", marginTop: 0, marginBottom: "20px" }}>
				Create {transactionType.toUpperCase()} Transaction
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
					Transaction Manager Name *
				</label>
				<VSCodeTextField
					value={formData.txtTransactionName}
					onInput={(e: any) => handleInputChange("txtTransactionName", e.target.value)}
					style={{ width: "100%", borderColor: errors.txtTransactionName ? "var(--vscode-errorForeground)" : undefined }}
				/>
				{errors.txtTransactionName && (
					<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
						{errors.txtTransactionName}
					</div>
				)}
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
					Datasource Name *
				</label>
				<VSCodeTextField
					value={formData.txtDataSourceName}
					onInput={(e: any) => handleInputChange("txtDataSourceName", e.target.value)}
					style={{ width: "100%", borderColor: errors.txtDataSourceName ? "var(--vscode-errorForeground)" : undefined }}
				/>
				{errors.txtDataSourceName && (
					<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
						{errors.txtDataSourceName}
					</div>
				)}
			</div>

			{/* JPA Specific Fields */}
			{transactionType === "jpa" && (
				<>
					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Entity Manager Factory Name *
						</label>
						<VSCodeTextField
							value={formData.txtEttMgrFactory}
							onInput={(e: any) => handleInputChange("txtEttMgrFactory", e.target.value)}
							style={{ width: "100%", borderColor: errors.txtEttMgrFactory ? "var(--vscode-errorForeground)" : undefined }}
						/>
						{errors.txtEttMgrFactory && (
							<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
								{errors.txtEttMgrFactory}
							</div>
						)}
					</div>

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Entity Packages to Scan *
						</label>
						<VSCodeTextField
							value={formData.txtEntityPackages}
							onInput={(e: any) => handleInputChange("txtEntityPackages", e.target.value)}
							placeholder="com.example.domain"
							style={{ width: "100%", borderColor: errors.txtEntityPackages ? "var(--vscode-errorForeground)" : undefined }}
						/>
						{errors.txtEntityPackages && (
							<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
								{errors.txtEntityPackages}
							</div>
						)}
					</div>

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Dialect *
						</label>
						<VSCodeDropdown
							value={formData.cmbDialect}
							onInput={(e: any) => handleInputChange("cmbDialect", e.target.value)}
							style={{ width: "100%", borderColor: errors.cmbDialect ? "var(--vscode-errorForeground)" : undefined }}>
							<VSCodeOption value="">Select a dialect</VSCodeOption>
							{dialectOptions.map(group => 
								group.options.map(option => (
									<VSCodeOption key={option.value} value={option.value}>
										{option.label}
									</VSCodeOption>
								))
							)}
						</VSCodeDropdown>
						{errors.cmbDialect && (
							<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
								{errors.cmbDialect}
							</div>
						)}
					</div>

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Repository Package *
						</label>
						<VSCodeTextField
							value={formData.txtRepositoryPackage}
							onInput={(e: any) => handleInputChange("txtRepositoryPackage", e.target.value)}
							placeholder="com.example.repository"
							style={{ width: "100%", borderColor: errors.txtRepositoryPackage ? "var(--vscode-errorForeground)" : undefined }}
						/>
						{errors.txtRepositoryPackage && (
							<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
								{errors.txtRepositoryPackage}
							</div>
						)}
					</div>
				</>
			)}

			{/* JTA Specific Fields */}
			{transactionType === "jta" && (
				<>
					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							JTA Manager *
						</label>
						<VSCodeTextField
							value={formData.txtJtaManager}
							onInput={(e: any) => handleInputChange("txtJtaManager", e.target.value)}
							style={{ width: "100%", borderColor: errors.txtJtaManager ? "var(--vscode-errorForeground)" : undefined }}
						/>
						{errors.txtJtaManager && (
							<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
								{errors.txtJtaManager}
							</div>
						)}
					</div>

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							JTA User Transaction *
						</label>
						<VSCodeTextField
							value={formData.txtJtaUserTransaction}
							onInput={(e: any) => handleInputChange("txtJtaUserTransaction", e.target.value)}
							style={{ width: "100%", borderColor: errors.txtJtaUserTransaction ? "var(--vscode-errorForeground)" : undefined }}
						/>
						{errors.txtJtaUserTransaction && (
							<div style={{ color: "var(--vscode-errorForeground)", fontSize: "12px", marginTop: "4px" }}>
								{errors.txtJtaUserTransaction}
							</div>
						)}
					</div>
				</>
			)}

			{/* Transaction Template */}
			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "flex", alignItems: "center", color: "var(--vscode-foreground)" }}>
					<input
						type="checkbox"
						checked={formData.chkTransactionTemplate || false}
						onChange={(e) => handleInputChange("chkTransactionTemplate", e.target.checked)}
						style={{ marginRight: "8px" }}
					/>
					Use Transaction Template
				</label>
			</div>

			{formData.chkTransactionTemplate && (
				<div style={{ marginBottom: "15px", marginLeft: "20px" }}>
					<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
						Transaction Template Name
					</label>
					<VSCodeTextField
						value={formData.txtTransactionTemplateName}
						onInput={(e: any) => handleInputChange("txtTransactionTemplateName", e.target.value)}
						style={{ width: "100%" }}
					/>
				</div>
			)}

			{/* Transaction Management Options */}
			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "flex", alignItems: "center", color: "var(--vscode-foreground)" }}>
					<input
						type="checkbox"
						checked={formData.chkAnnotationTransactionManagement || false}
						onChange={(e) => handleInputChange("chkAnnotationTransactionManagement", e.target.checked)}
						style={{ marginRight: "8px" }}
					/>
					Enable Annotation-Driven Transaction Management
				</label>
			</div>

			<div style={{ marginBottom: "15px" }}>
				<label style={{ display: "flex", alignItems: "center", color: "var(--vscode-foreground)" }}>
					<input
						type="checkbox"
						checked={formData.chkConfigurationalTransactionManagement || false}
						onChange={(e) => handleInputChange("chkConfigurationalTransactionManagement", e.target.checked)}
						style={{ marginRight: "8px" }}
					/>
					Enable Configurational Transaction Management
				</label>
			</div>

			{/* Configurational Transaction Settings */}
			{formData.chkConfigurationalTransactionManagement && (
				<div style={{ marginLeft: "20px" }}>
					<h4 style={{ color: "var(--vscode-foreground)", marginBottom: "10px" }}>Transaction Attributes</h4>
					
					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Pointcut Name
						</label>
						<VSCodeTextField
							value={formData.txtPointCutName}
							onInput={(e: any) => handleInputChange("txtPointCutName", e.target.value)}
							style={{ width: "100%" }}
						/>
					</div>

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Pointcut Expression
						</label>
						<VSCodeTextField
							value={formData.txtPointCutExpression}
							onInput={(e: any) => handleInputChange("txtPointCutExpression", e.target.value)}
							style={{ width: "100%" }}
						/>
					</div>

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Advice Name
						</label>
						<VSCodeTextField
							value={formData.txtAdviceName}
							onInput={(e: any) => handleInputChange("txtAdviceName", e.target.value)}
							style={{ width: "100%" }}
						/>
					</div>

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Method Name
						</label>
						<VSCodeTextField
							value={formData.txtMethodName}
							onInput={(e: any) => handleInputChange("txtMethodName", e.target.value)}
							style={{ width: "100%" }}
						/>
					</div>

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "flex", alignItems: "center", color: "var(--vscode-foreground)" }}>
							<input
								type="checkbox"
								checked={formData.chkReadOnly || false}
								onChange={(e) => handleInputChange("chkReadOnly", e.target.checked)}
								style={{ marginRight: "8px" }}
							/>
							Read-Only
						</label>
					</div>

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "flex", alignItems: "center", color: "var(--vscode-foreground)" }}>
							<input
								type="checkbox"
								checked={formData.chkRollbackFor || false}
								onChange={(e) => handleInputChange("chkRollbackFor", e.target.checked)}
								style={{ marginRight: "8px" }}
							/>
							Rollback For Exception
						</label>
					</div>

					{formData.chkRollbackFor && (
						<div style={{ marginBottom: "15px", marginLeft: "20px" }}>
							<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
								Rollback For
							</label>
							<VSCodeTextField
								value={formData.txtRollbackFor}
								onInput={(e: any) => handleInputChange("txtRollbackFor", e.target.value)}
								style={{ width: "100%" }}
							/>
						</div>
					)}

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "flex", alignItems: "center", color: "var(--vscode-foreground)" }}>
							<input
								type="checkbox"
								checked={formData.chkNoRollbackFor || false}
								onChange={(e) => handleInputChange("chkNoRollbackFor", e.target.checked)}
								style={{ marginRight: "8px" }}
							/>
							No Rollback For Exception
						</label>
					</div>

					{formData.chkNoRollbackFor && (
						<div style={{ marginBottom: "15px", marginLeft: "20px" }}>
							<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
								No Rollback For
							</label>
							<VSCodeTextField
								value={formData.txtNoRollbackFor}
								onInput={(e: any) => handleInputChange("txtNoRollbackFor", e.target.value)}
								style={{ width: "100%" }}
							/>
						</div>
					)}

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "flex", alignItems: "center", color: "var(--vscode-foreground)" }}>
							<input
								type="checkbox"
								checked={formData.chkTimeout || false}
								onChange={(e) => handleInputChange("chkTimeout", e.target.checked)}
								style={{ marginRight: "8px" }}
							/>
							Set Timeout
						</label>
					</div>

					{formData.chkTimeout && (
						<div style={{ marginBottom: "15px", marginLeft: "20px" }}>
							<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
								Timeout (seconds)
							</label>
							<VSCodeTextField
								value={formData.txtTimeout}
								onInput={(e: any) => handleInputChange("txtTimeout", e.target.value)}
								style={{ width: "100%" }}
							/>
						</div>
					)}

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Propagation
						</label>
						<VSCodeDropdown
							value={formData.cmbPropagation}
							onInput={(e: any) => handleInputChange("cmbPropagation", e.target.value)}
							style={{ width: "100%" }}>
							<VSCodeOption value="REQUIRED">REQUIRED</VSCodeOption>
							<VSCodeOption value="SUPPORTS">SUPPORTS</VSCodeOption>
							<VSCodeOption value="MANDATORY">MANDATORY</VSCodeOption>
							<VSCodeOption value="REQUIRES_NEW">REQUIRES_NEW</VSCodeOption>
							<VSCodeOption value="NOT_SUPPORTED">NOT_SUPPORTED</VSCodeOption>
							<VSCodeOption value="NEVER">NEVER</VSCodeOption>
							<VSCodeOption value="NESTED">NESTED</VSCodeOption>
						</VSCodeDropdown>
					</div>

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Isolation
						</label>
						<VSCodeDropdown
							value={formData.cmbIsolation}
							onInput={(e: any) => handleInputChange("cmbIsolation", e.target.value)}
							style={{ width: "100%" }}>
							<VSCodeOption value="DEFAULT">DEFAULT</VSCodeOption>
							<VSCodeOption value="READ_UNCOMMITTED">READ_UNCOMMITTED</VSCodeOption>
							<VSCodeOption value="READ_COMMITTED">READ_COMMITTED</VSCodeOption>
							<VSCodeOption value="REPEATABLE_READ">REPEATABLE_READ</VSCodeOption>
							<VSCodeOption value="SERIALIZABLE">SERIALIZABLE</VSCodeOption>
						</VSCodeDropdown>
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

export default TransactionForm 