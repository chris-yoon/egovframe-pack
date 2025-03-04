import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';

/**
 * Interface for snippet definition
 */
interface SnippetDefinition {
    prefix: string;
    body: string[] | string;
    description: string;
}

/**
 * Interface for snippet file content
 */
interface SnippetFile {
    [key: string]: SnippetDefinition;
}

/**
 * Register the snippet command
 */
export function registerSnippetCommand(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand('extension.insertEgovSnippet', async () => {
        try {
            // Load all snippets
            const snippets = await loadAllSnippets(context.extensionPath);
            
            // Create QuickPick items from snippets
            const items = snippets.map(snippet => ({
                label: snippet.prefix,
                description: snippet.description,
                detail: snippet.category,
                snippet: snippet
            }));
            
            // Show QuickPick
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select an eGovFrame snippet to insert',
                matchOnDescription: true,
                matchOnDetail: true
            });
            
            if (selected) {
                // Get active editor
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showErrorMessage('No active editor!');
                    return;
                }
                
                // Insert the snippet
                const snippetBody = Array.isArray(selected.snippet.body) 
                    ? selected.snippet.body.join('\n') 
                    : selected.snippet.body;
                
                // Ensure proper cursor placement with ${0} if not present
                let processedBody = snippetBody;
                if (!processedBody.includes('${0}')) {
                    processedBody += '\n${0}';
                }
                
                const snippetString = new vscode.SnippetString(processedBody);
                
                // Insert at current position
                await editor.insertSnippet(snippetString);
                
                // Ensure editor keeps focus
                await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error loading snippets: ${error}`);
        }
    });
    
    context.subscriptions.push(disposable);
}

/**
 * Load all snippets from the snippet files
 */
async function loadAllSnippets(extensionPath: string): Promise<Array<{
    prefix: string;
    body: string[] | string;
    description: string;
    category: string;
}>> {
    const snippetsDir = path.join(extensionPath, 'snippets', 'explorer');
    const snippetFiles = await fs.readdir(snippetsDir);
    
    const allSnippets: Array<{
        prefix: string;
        body: string[] | string;
        description: string;
        category: string;
    }> = [];
    
    for (const file of snippetFiles) {
        if (file.endsWith('.json')) {
            const filePath = path.join(snippetsDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const snippetFile = JSON.parse(content) as SnippetFile;
            
            // Determine category from filename
            const category = file.replace('-snippets.json', '').toUpperCase();
            
            // Add each snippet to the array
            for (const [name, definition] of Object.entries(snippetFile)) {
                // Process the body to ensure proper cursor placement
                let processedBody = definition.body;
                if (Array.isArray(processedBody)) {
                    // Check if any line contains ${0}
                    if (!processedBody.some(line => line.includes('${0}'))) {
                        // Add ${0} to the end if not present
                        processedBody.push('${0}');
                    }
                } else if (typeof processedBody === 'string' && !processedBody.includes('${0}')) {
                    processedBody += '\n${0}';
                }
                
                allSnippets.push({
                    prefix: definition.prefix,
                    body: processedBody,
                    description: definition.description,
                    category: category
                });
            }
        }
    }
    
    return allSnippets;
} 
