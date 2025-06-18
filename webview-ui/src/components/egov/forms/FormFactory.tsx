import React from "react"
import { TemplateConfig, FormComponentProps } from "../types/templates"
import DatasourceForm from "./DatasourceForm"
import LoggingForm from "./LoggingForm"
import CacheForm from "./CacheForm"
import IdGenerationForm from "./IdGenerationForm"
import TransactionForm from "./TransactionForm"
import SchedulingForm from "./SchedulingForm"
import PropertyForm from "./PropertyForm"
import GenericForm from "./GenericForm"

interface FormFactoryProps extends Omit<FormComponentProps, "template"> {
	template: TemplateConfig
}

const FormFactory: React.FC<FormFactoryProps> = ({ template, onSubmit, onCancel, initialData }) => {
	const getFormComponent = () => {
		const webView = template.webView

		// Cache forms
		if (webView.includes("cache-")) {
			return <CacheForm template={template} onSubmit={onSubmit} onCancel={onCancel} initialData={initialData} />
		}

		// Datasource forms
		if (webView.includes("datasource-")) {
			if (webView.includes("jndi")) {
				return <GenericForm formType="jndi" title="Create JNDI Datasource" onSubmit={onSubmit} onCancel={onCancel} />
			}
			return <DatasourceForm onSubmit={onSubmit} onCancel={onCancel} />
		}

		// Transaction forms
		if (webView.includes("transaction-")) {
			const transactionType = webView.includes("jpa")
				? "jpa"
				: webView.includes("jta")
					? "jta"
					: "datasource"
			return <TransactionForm transactionType={transactionType as "datasource" | "jpa" | "jta"} onSubmit={onSubmit} onCancel={onCancel} />
		}

		// ID Generation forms
		if (webView.includes("id-gnr-")) {
			return <IdGenerationForm template={template} onSubmit={onSubmit} onCancel={onCancel} initialData={initialData} />
		}

		// Logging forms
		if (webView.includes("logging-")) {
			const loggingType = webView.includes("console")
				? "console"
				: webView.includes("rollingFile") || webView.includes("timeBased")
					? "rollingFile"
					: webView.includes("file")
						? "file"
						: webView.includes("jdbc")
							? "jdbc"
							: "console"
			return <LoggingForm loggingType={loggingType as "console" | "file" | "rollingFile" | "jdbc"} onSubmit={onSubmit} onCancel={onCancel} />
		}

		// Property forms
		if (webView.includes("property-")) {
			return <PropertyForm onSubmit={onSubmit} onCancel={onCancel} />
		}

		// Scheduling forms
		if (webView.includes("scheduling-")) {
			const schedulingType = webView.includes("beanJob")
				? "beanJob"
				: webView.includes("cronTrigger")
					? "cronTrigger"
					: webView.includes("simpleTrigger")
						? "simpleTrigger"
						: webView.includes("methodJob")
							? "methodJob"
							: "scheduler"
			return <SchedulingForm schedulingType={schedulingType as "scheduler" | "beanJob" | "cronTrigger" | "simpleTrigger" | "methodJob"} onSubmit={onSubmit} onCancel={onCancel} />
		}

		// Special cases
		if (webView.includes("generateProject")) {
			return <GenericForm formType="project" title="Generate eGovFrame Project" onSubmit={onSubmit} onCancel={onCancel} />
		}
		
		if (webView.includes("generateXmlByForm")) {
			return <GenericForm formType="xml" title="Generate XML Configuration" onSubmit={onSubmit} onCancel={onCancel} />
		}

		// Default fallback
		return <GenericForm formType="generic" title="Generate Configuration" onSubmit={onSubmit} onCancel={onCancel} />
	}

	return <div>{getFormComponent()}</div>
}

export default FormFactory 