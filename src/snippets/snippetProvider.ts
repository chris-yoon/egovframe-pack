import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';

/**
 * A completion provider that provides eGovFrame-specific code snippets.
 * This provider is context-aware and can provide different snippets based on the file type and content.
 */
export class EgovSnippetProvider implements vscode.CompletionItemProvider {
    
    /**
     * Provide completion items for the given position and document.
     */
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
        // Get the current line text up to the cursor
        const linePrefix = document.lineAt(position).text.substr(0, position.character);
        
        // Check if we're typing a snippet prefix
        if (!linePrefix.endsWith('egov-')) {
            return undefined;
        }
        
        const completionItems: vscode.CompletionItem[] = [];
        
        // Add dynamic snippets based on file type
        const fileExtension = path.extname(document.fileName);
        
        if (fileExtension === '.java') {
            this.addJavaSnippets(completionItems, document);
        } else if (fileExtension === '.xml') {
            this.addXmlSnippets(completionItems, document);
        } else if (fileExtension === '.jsp') {
            this.addJspSnippets(completionItems);
        }
        
        return completionItems;
    }
    
    /**
     * Add Java-specific snippets based on the file content.
     */
    private addJavaSnippets(completionItems: vscode.CompletionItem[], document: vscode.TextDocument): void {
        const text = document.getText();
        
        // Check if this is a controller class
        if (text.includes('@Controller') || document.fileName.includes('Controller')) {
            // Add controller-specific snippets
            const requestMappingSnippet = new vscode.CompletionItem('egov-requestmapping', vscode.CompletionItemKind.Snippet);
            requestMappingSnippet.insertText = new vscode.SnippetString(
                '@RequestMapping(value="/${1:path}")\n' +
                'public String ${2:methodName}(@ModelAttribute("${3:voName}") ${4:VOType} ${3:voName}, ModelMap model) throws Exception {\n' +
                '    ${0}\n' +
                '    return "/${1:path}/${5:viewName}";\n' +
                '}'
            );
            requestMappingSnippet.documentation = new vscode.MarkdownString('eGovFrame RequestMapping method');
            completionItems.push(requestMappingSnippet);
        }
        
        // Check if this is a service implementation class
        if (text.includes('implements') && text.includes('Service') && text.includes('@Service')) {
            // Add service-specific snippets
            const serviceMethodSnippet = new vscode.CompletionItem('egov-servicemethod', vscode.CompletionItemKind.Snippet);
            serviceMethodSnippet.insertText = new vscode.SnippetString(
                '@Override\n' +
                'public ${1:ReturnType} ${2:methodName}(${3:ParamType} ${4:paramName}) throws Exception {\n' +
                '    ${0}\n' +
                '    return ${5:daoName}.${2:methodName}(${4:paramName});\n' +
                '}'
            );
            serviceMethodSnippet.documentation = new vscode.MarkdownString('eGovFrame Service method implementation');
            completionItems.push(serviceMethodSnippet);
        }
    }
    
    /**
     * Add XML-specific snippets based on the file content.
     */
    private addXmlSnippets(completionItems: vscode.CompletionItem[], document: vscode.TextDocument): void {
        const text = document.getText();
        
        // Check if this is a MyBatis mapper file
        if (text.includes('<!DOCTYPE mapper') || document.fileName.includes('_SQL.xml')) {
            // Add mapper-specific snippets
            const insertSnippet = new vscode.CompletionItem('egov-insert', vscode.CompletionItemKind.Snippet);
            insertSnippet.insertText = new vscode.SnippetString(
                '<insert id="insert${1:Name}" parameterType="${2:package}.service.${1:Name}VO">\n' +
                '    INSERT INTO ${3:TABLE_NAME} (\n' +
                '        ID, NAME, DESCRIPTION, USE_YN, REG_USER\n' +
                '    ) VALUES (\n' +
                '        #{id}, #{name}, #{description}, #{useYn}, #{regUser}\n' +
                '    )\n' +
                '    ${0}\n' +
                '</insert>'
            );
            insertSnippet.documentation = new vscode.MarkdownString('eGovFrame MyBatis insert statement');
            completionItems.push(insertSnippet);
            
            const updateSnippet = new vscode.CompletionItem('egov-update', vscode.CompletionItemKind.Snippet);
            updateSnippet.insertText = new vscode.SnippetString(
                '<update id="update${1:Name}" parameterType="${2:package}.service.${1:Name}VO">\n' +
                '    UPDATE ${3:TABLE_NAME} SET\n' +
                '        NAME = #{name},\n' +
                '        DESCRIPTION = #{description},\n' +
                '        USE_YN = #{useYn}\n' +
                '    WHERE ID = #{id}\n' +
                '    ${0}\n' +
                '</update>'
            );
            updateSnippet.documentation = new vscode.MarkdownString('eGovFrame MyBatis update statement');
            completionItems.push(updateSnippet);
            
            const deleteSnippet = new vscode.CompletionItem('egov-delete', vscode.CompletionItemKind.Snippet);
            deleteSnippet.insertText = new vscode.SnippetString(
                '<delete id="delete${1:Name}" parameterType="${2:package}.service.${1:Name}VO">\n' +
                '    DELETE FROM ${3:TABLE_NAME}\n' +
                '    WHERE ID = #{id}\n' +
                '    ${0}\n' +
                '</delete>'
            );
            deleteSnippet.documentation = new vscode.MarkdownString('eGovFrame MyBatis delete statement');
            completionItems.push(deleteSnippet);
        }
        
        // Check if this is a Spring configuration file
        if (text.includes('<beans') && text.includes('www.springframework.org')) {
            // Add Spring configuration snippets
            const beanSnippet = new vscode.CompletionItem('egov-bean', vscode.CompletionItemKind.Snippet);
            beanSnippet.insertText = new vscode.SnippetString(
                '<bean id="${1:beanId}" class="${2:package}.${3:ClassName}">\n' +
                '    <property name="${4:propertyName}" value="${5:propertyValue}" />\n' +
                '    ${0}\n' +
                '</bean>'
            );
            beanSnippet.documentation = new vscode.MarkdownString('eGovFrame Spring bean definition');
            completionItems.push(beanSnippet);
        }
    }
    
    /**
     * Add JSP-specific snippets.
     */
    private addJspSnippets(completionItems: vscode.CompletionItem[]): void {
        const tagLibSnippet = new vscode.CompletionItem('egov-taglib', vscode.CompletionItemKind.Snippet);
        tagLibSnippet.insertText = new vscode.SnippetString(
            '<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>\n' +
            '<%@ taglib prefix="form" uri="http://www.springframework.org/tags/form" %>\n' +
            '<%@ taglib prefix="ui" uri="http://egovframework.gov/ctl/ui" %>\n' +
            '<%@ taglib prefix="spring" uri="http://www.springframework.org/tags" %>\n' +
            '${0}'
        );
        tagLibSnippet.documentation = new vscode.MarkdownString('eGovFrame JSP taglib declarations');
        completionItems.push(tagLibSnippet);
        
        const paginationSnippet = new vscode.CompletionItem('egov-pagination', vscode.CompletionItemKind.Snippet);
        paginationSnippet.insertText = new vscode.SnippetString(
            '<div class="pagination">\n' +
            '    <ui:pagination paginationInfo="${1:paginationInfo}" type="image" jsFunction="${2:fn_search}" />\n' +
            '    <form:hidden path="pageIndex" />\n' +
            '    ${0}\n' +
            '</div>'
        );
        paginationSnippet.documentation = new vscode.MarkdownString('eGovFrame pagination component');
        completionItems.push(paginationSnippet);
    }
}

/**
 * Register the snippet provider with VS Code.
 */
export function registerSnippetProvider(context: vscode.ExtensionContext): void {
    // Register for Java files
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { language: 'java' },
            new EgovSnippetProvider(),
            '-' // Trigger on typing '-' after 'egov'
        )
    );
    
    // Register for XML files
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { language: 'xml' },
            new EgovSnippetProvider(),
            '-' // Trigger on typing '-' after 'egov'
        )
    );
    
    // Register for JSP files
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { language: 'jsp' },
            new EgovSnippetProvider(),
            '-' // Trigger on typing '-' after 'egov'
        )
    );
} 