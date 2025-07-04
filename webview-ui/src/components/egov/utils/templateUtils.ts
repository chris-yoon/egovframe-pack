import { TemplateConfig, GroupedTemplates } from "../types/templates"

// templates-context-xml.json 파일의 내용을 기반으로 한 템플릿 데이터
export function loadTemplates(): TemplateConfig[] {
	const templatesData: TemplateConfig[] = [
		{
			displayName: "Cache > New Cache",
			templateFolder: "cache",
			templateFile: "cache.hbs",
			webView: "cache-cache-form.html",
			fileNameProperty: "txtFileName",
			javaConfigTemplate: "cache-java.hbs",
			yamlTemplate: "",
			propertiesTemplate: ""
		},
		{
			displayName: "Cache > New Encache Configuration",
			templateFolder: "cache",
			templateFile: "ehcacheConfigForSpring.hbs",
			webView: "cache-ehcacheConfigForSpring-form.html",
			fileNameProperty: "txtFileName",
			javaConfigTemplate: "ehcacheConfigForSpring-java.hbs",
			yamlTemplate: "",
			propertiesTemplate: ""
		},
		{
			displayName: "Datasource > New Datasource",
			templateFolder: "datasource",
			templateFile: "datasource.hbs",
			webView: "datasource-datasource-form.html",
			fileNameProperty: "txtFileName",
			javaConfigTemplate: "datasource-java.hbs",
			yamlTemplate: "",
			propertiesTemplate: ""
		},
		{
			displayName: "Datasource > New JNDI Datasource",
			templateFolder: "datasource",
			templateFile: "jndiDatasource.hbs",
			webView: "datasource-jndiDatasource-form.html",
			fileNameProperty: "txtFileName",
			javaConfigTemplate: "jndiDatasource-java.hbs",
			yamlTemplate: "",
			propertiesTemplate: ""
		},
		{
			displayName: "Transaction > New Datasource Transaction",
			templateFolder: "transaction",
			templateFile: "datasource.hbs",
			webView: "transaction-datasource-form.html",
			fileNameProperty: "txtFileName",
			javaConfigTemplate: "datasource-java.hbs",
			yamlTemplate: "",
			propertiesTemplate: ""
		},
		{
			displayName: "Transaction > New JPA Transaction",
			templateFolder: "transaction",
			templateFile: "jpa.hbs",
			webView: "transaction-jpa-form.html",
			fileNameProperty: "txtFileName",
			javaConfigTemplate: "jpa-java.hbs",
			yamlTemplate: "",
			propertiesTemplate: ""
		},
		{
			displayName: "Transaction > New JTA Transaction",
			templateFolder: "transaction",
			templateFile: "jta.hbs",
			webView: "transaction-jta-form.html",
			fileNameProperty: "txtFileName",
			javaConfigTemplate: "jta-java.hbs",
			yamlTemplate: "",
			propertiesTemplate: ""
		},
		{
			displayName: "ID Generation > New Sequence ID Generation",
			templateFolder: "idGeneration",
			templateFile: "xml-id-gnr-sequence-service.hbs",
			webView: "id-gnr-sequence-form.html",
			fileNameProperty: "txtFileName",
			javaConfigTemplate: "xml-id-gnr-sequence-service-java.hbs",
			yamlTemplate: "",
			propertiesTemplate: ""
		},
		{
			displayName: "ID Generation > New Table ID Generation",
			templateFolder: "idGeneration",
			templateFile: "xml-id-gnr-table-service.hbs",
			webView: "id-gnr-table-form.html",
			fileNameProperty: "txtFileName",
			javaConfigTemplate: "xml-id-gnr-table-service-java.hbs",
			yamlTemplate: "",
			propertiesTemplate: ""
		},
		{
			displayName: "ID Generation > New UUID Generation",
			templateFolder: "idGeneration",
			templateFile: "xml-id-gnr-uuid-service.hbs",
			webView: "id-gnr-uuid-form.html",
			fileNameProperty: "txtFileName",
			javaConfigTemplate: "xml-id-gnr-uuid-service-java.hbs",
			yamlTemplate: "",
			propertiesTemplate: ""
		},
		{
			displayName: "Property > New Property",
			templateFolder: "property",
			templateFile: "property.hbs",
			webView: "property-property-form.html",
			fileNameProperty: "txtFileName",
			javaConfigTemplate: "property-java.hbs",
			yamlTemplate: "",
			propertiesTemplate: ""
		},
		{
			displayName: "Scheduling > New Detail Bean Job",
			templateFolder: "scheduling",
			templateFile: "beanJob.hbs",
			webView: "scheduling-beanJob-form.html",
			fileNameProperty: "txtFileName",
			javaConfigTemplate: "beanJob-java.hbs",
			yamlTemplate: "",
			propertiesTemplate: ""
		},
		{
			displayName: "Scheduling > New Method Invoking Job",
			templateFolder: "scheduling",
			templateFile: "methodJob.hbs",
			webView: "scheduling-methodJob-form.html",
			fileNameProperty: "txtFileName",
			javaConfigTemplate: "methodJob-java.hbs",
			yamlTemplate: "",
			propertiesTemplate: ""
		},
		{
			displayName: "Scheduling > New Simple Trigger",
			templateFolder: "scheduling",
			templateFile: "simpleTrigger.hbs",
			webView: "scheduling-simpleTrigger-form.html",
			fileNameProperty: "txtFileName",
			javaConfigTemplate: "simpleTrigger-java.hbs",
			yamlTemplate: "",
			propertiesTemplate: ""
		},
		{
			displayName: "Scheduling > New Cron Trigger",
			templateFolder: "scheduling",
			templateFile: "cronTrigger.hbs",
			webView: "scheduling-cronTrigger-form.html",
			fileNameProperty: "txtFileName",
			javaConfigTemplate: "cronTrigger-java.hbs",
			yamlTemplate: "",
			propertiesTemplate: ""
		},
		{
			displayName: "Scheduling > New Scheduler",
			templateFolder: "scheduling",
			templateFile: "scheduler.hbs",
			webView: "scheduling-scheduler-form.html",
			fileNameProperty: "txtFileName",
			javaConfigTemplate: "scheduler-java.hbs",
			yamlTemplate: "",
			propertiesTemplate: ""
		},
		{
			displayName: "Logging > New Console Appender",
			templateFolder: "logging",
			templateFile: "console.hbs",
			webView: "logging-console-form.html",
			fileNameProperty: "txtFileName",
			javaConfigTemplate: "console-java.hbs",
			yamlTemplate: "console-yaml.hbs",
			propertiesTemplate: "console-properties.hbs"
		},
		{
			displayName: "Logging > New File Appender",
			templateFolder: "logging",
			templateFile: "file.hbs",
			webView: "logging-file-form.html",
			fileNameProperty: "txtFileName",
			javaConfigTemplate: "file-java.hbs",
			yamlTemplate: "file-yaml.hbs",
			propertiesTemplate: "file-properties.hbs"
		},
		{
			displayName: "Logging > New Rolling File Appender",
			templateFolder: "logging",
			templateFile: "rollingFile.hbs",
			webView: "logging-rollingFile-form.html",
			fileNameProperty: "txtFileName",
			javaConfigTemplate: "rollingFile-java.hbs",
			yamlTemplate: "rollingFile-yaml.hbs",
			propertiesTemplate: "rollingFile-properties.hbs"
		},
		{
			displayName: "Logging > New Time-Based Rolling File Appender",
			templateFolder: "logging",
			templateFile: "timeBasedRollingFile.hbs",
			webView: "logging-timeBased-RollingFile-form.html",
			fileNameProperty: "txtFileName",
			javaConfigTemplate: "dailyRollingFile-java.hbs",
			yamlTemplate: "timeBasedRollingFile-yaml.hbs",
			propertiesTemplate: "timeBasedRollingFile-properties.hbs"
		},
		{
			displayName: "Logging > New JDBC Appender",
			templateFolder: "logging",
			templateFile: "jdbc.hbs",
			webView: "logging-jdbc-form.html",
			fileNameProperty: "txtFileName",
			javaConfigTemplate: "jdbc-java.hbs",
			yamlTemplate: "jdbc-yaml.hbs",
			propertiesTemplate: "jdbc-properties.hbs"
		}
	]

	return templatesData
}

export function groupTemplates(templates: TemplateConfig[]): GroupedTemplates {
	const grouped: GroupedTemplates = {}

	templates.forEach((template) => {
		const parts = template.displayName.split(" > ")
		if (parts.length >= 2) {
			const category = parts[0]
			const subcategory = parts[1]

			if (!grouped[category]) {
				grouped[category] = {}
			}

			grouped[category][subcategory] = template
		}
	})

	return grouped
}

export function getTemplatesByCategory(category: string): TemplateConfig[] {
	const templates = loadTemplates()
	return templates.filter((template) => template.displayName.toLowerCase().includes(category.toLowerCase()))
} 