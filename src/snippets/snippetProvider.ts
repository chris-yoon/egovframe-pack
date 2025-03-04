import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';

interface SnippetConditions {
    fileContent?: string[];
    fileName?: string[];
}

interface SnippetDefinition {
    prefix: string;
    body: string[] | string;
    description: string;
}

interface CategorySnippets {
    conditions: SnippetConditions;
    snippets: {
        [key: string]: SnippetDefinition;
    };
}

interface SnippetFile {
    [category: string]: CategorySnippets;
}

/**
 * A completion provider that provides eGovFrame-specific code snippets.
 * This provider is context-aware and can provide different snippets based on the file type and content.
 */
export class EgovSnippetProvider implements vscode.CompletionItemProvider {
    constructor(private extensionPath: string) {}

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.CompletionItem[]> {
        const linePrefix = document.lineAt(position).text.substr(0, position.character);
        
        // 'egov-'로 시작하는 경우에만 스니펓 제공
        if (!linePrefix.endsWith('egov-')) {
            return [];
        }

        const completionItems: vscode.CompletionItem[] = [];
        const fileContent = document.getText();
        const fileName = path.basename(document.fileName);

        // snippets/provider 디렉토리에서 파일 확장자에 맞는 스니펓 파일 로드
        const fileExtension = fileName.split('.').pop();
        const snippetFile = `${fileExtension}-snippets.json`;
        const snippetPath = path.join(this.extensionPath, 'snippets', 'provider', snippetFile);

        try {
            const snippets = await fs.readJSON(snippetPath) as SnippetFile;

            Object.entries(snippets).forEach(([category, categoryData]) => {
                const { conditions, snippets: categorySnippets } = categoryData;
                
                // 파일 이름과 내용이 조건과 일치하는지 확인
                if (this.matchesConditions(fileName, fileContent, conditions)) {
                    Object.entries(categorySnippets).forEach(([name, snippet]) => {
                        const item = new vscode.CompletionItem(
                            snippet.prefix,
                            vscode.CompletionItemKind.Snippet
                        );
                        
                        const snippetBody = Array.isArray(snippet.body) 
                            ? snippet.body.join('\n')
                            : snippet.body;
                        
                        item.insertText = new vscode.SnippetString(snippetBody);
                        item.documentation = new vscode.MarkdownString(snippet.description);
                        // 중요: range를 설정하여 'egov-' 문자열을 대체
                        const startPos = position.translate(0, -5); // 'egov-'의 길이만큼 뒤로
                        console.log('Snippet range:', {
                            start: `line ${startPos.line}, char ${startPos.character}`,
                            end: `line ${position.line}, char ${position.character}`,
                            prefix: snippet.prefix
                        });
                        
                        item.range = new vscode.Range(startPos, position);
                        completionItems.push(item);
                    });
                }
            });
        } catch (error) {
            console.error(`Error loading snippets: ${error}`);
        }

        return completionItems;
    }

    private matchesConditions(fileName: string, fileContent: string, conditions: SnippetConditions): boolean {
        if (conditions.fileName && !conditions.fileName.some(pattern => fileName.includes(pattern))) {
            return false;
        }
        if (conditions.fileContent && !conditions.fileContent.some(pattern => fileContent.includes(pattern))) {
            return false;
        }
        return true;
    }
}

/**
 * Register the snippet provider with VS Code.
 */
export function registerSnippetProvider(context: vscode.ExtensionContext): void {
    const provider = new EgovSnippetProvider(context.extensionPath);
    
    const languages = ['java', 'xml'];
    for (const language of languages) {
        context.subscriptions.push(
            vscode.languages.registerCompletionItemProvider(
                { language },
                provider,
                '-'
            )
        );
    }
} 
