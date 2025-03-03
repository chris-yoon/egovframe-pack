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
 * TreeItem for the Snippet Explorer
 */
class SnippetTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly snippet?: {
            prefix: string;
            body: string[] | string;
            description: string;
        },
        public readonly category?: string
    ) {
        super(label, collapsibleState);
        
        if (snippet) {
            this.tooltip = snippet.description;
            this.description = snippet.prefix;
            this.command = {
                command: 'extension.insertSnippetFromExplorer',
                title: 'Insert Snippet',
                arguments: [snippet]
            };
        } else if (category) {
            this.tooltip = `${category} Snippets`;
        }
    }
}

/**
 * TreeDataProvider for the Snippet Explorer
 */
class SnippetTreeDataProvider implements vscode.TreeDataProvider<SnippetTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SnippetTreeItem | undefined | void> = new vscode.EventEmitter<SnippetTreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<SnippetTreeItem | undefined | void> = this._onDidChangeTreeData.event;
    
    constructor(private extensionPath: string) {}
    
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    
    getTreeItem(element: SnippetTreeItem): vscode.TreeItem {
        return element;
    }
    
    async getChildren(element?: SnippetTreeItem): Promise<SnippetTreeItem[]> {
        if (!element) {
            // Root level - show categories
            const snippetsDir = path.join(this.extensionPath, 'snippets');
            
            try {
                const files = await fs.readdir(snippetsDir);
                const categories = files
                    .filter(file => file.endsWith('.json'))
                    .map(file => {
                        const category = file.replace('-snippets.json', '').toUpperCase();
                        return new SnippetTreeItem(
                            category,
                            vscode.TreeItemCollapsibleState.Collapsed,
                            undefined,
                            category
                        );
                    });
                
                return categories;
            } catch (error) {
                vscode.window.showErrorMessage(`Error loading snippet categories: ${error}`);
                return [];
            }
        } else if (element.category) {
            // Category level - show snippets in this category
            const snippetsDir = path.join(this.extensionPath, 'snippets');
            const filePath = path.join(snippetsDir, `${element.category.toLowerCase()}-snippets.json`);
            
            try {
                const content = await fs.readFile(filePath, 'utf8');
                const snippetFile = JSON.parse(content) as SnippetFile;
                
                const snippets = Object.entries(snippetFile).map(([name, definition]) => {
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
                    
                    return new SnippetTreeItem(
                        name,
                        vscode.TreeItemCollapsibleState.None,
                        {
                            prefix: definition.prefix,
                            body: processedBody,
                            description: definition.description
                        }
                    );
                });
                
                return snippets;
            } catch (error) {
                vscode.window.showErrorMessage(`Error loading snippets: ${error}`);
                return [];
            }
        }
        
        return [];
    }
}

/**
 * Register the Snippet Explorer
 */
export function registerSnippetExplorer(context: vscode.ExtensionContext): void {
    // Create the tree data provider
    const snippetTreeDataProvider = new SnippetTreeDataProvider(context.extensionPath);
    
    // Register the tree view
    const treeView = vscode.window.createTreeView('egovframeSnippetsView', {
        treeDataProvider: snippetTreeDataProvider,
        showCollapseAll: true
    });
    
    // Register the refresh command
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.refreshSnippets', () => {
            snippetTreeDataProvider.refresh();
        })
    );
    
    // Register the insert snippet command
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.insertSnippetFromExplorer', async (snippet: {
            prefix: string;
            body: string[] | string;
            description: string;
        }) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor!');
                return;
            }
            
            // Process the body to ensure proper cursor placement
            const snippetBody = Array.isArray(snippet.body) 
                ? snippet.body.join('\n') 
                : snippet.body;
            
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
        })
    );
    
    context.subscriptions.push(treeView);
} 