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
    private snippetCache: Map<string, SnippetFile> = new Map();
    private initialized: boolean = false;

    constructor(private extensionPath: string) {
        this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            await this.loadSnippets();
            this.initialized = true;
        } catch (err) {
            console.error('Failed to initialize snippets:', err);
        }
    }

    private async loadSnippets(): Promise<void> {
        const snippetTypes = ['xml', 'java'];
        for (const type of snippetTypes) {
            try {
                const snippetPath = path.join(
                    this.extensionPath, 
                    'snippets', 
                    'provider', 
                    `${type}-snippets.json`
                );
                const snippets = await fs.readJSON(snippetPath) as SnippetFile;
                this.snippetCache.set(type, snippets);
            } catch (error) {
                console.error(`Failed to load ${type} snippets:`, error);
            }
        }
    }

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.CompletionItem[]> {
        // 초기화가 완료될 때까지 대기
        if (!this.initialized) {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (!this.initialized) {
                return [];
            }
        }

        try {
            // 취소 토큰 확인
            if (token.isCancellationRequested) {
                return [];
            }

            const linePrefix = document.lineAt(position).text.slice(0, position.character);
            if (!linePrefix.endsWith('egov-')) {
                return [];
            }

            const fileName = path.basename(document.fileName).toLowerCase();
            const fileContent = document.getText();
            
            // 파일 타입 결정
            let fileType = 'xml';
            if (fileName.endsWith('.java')) {
                fileType = 'java';
            }

            // 캐시된 스니펫 사용
            const snippets = this.snippetCache.get(fileType);
            if (!snippets) {
                console.warn(`No snippets found for file type: ${fileType}`);
                return [];
            }

            const completionItems: vscode.CompletionItem[] = [];

            // 스니펫 처리
            Object.entries(snippets).forEach(([category, categoryData]) => {
                if (this.matchesConditions(fileName, fileContent, categoryData.conditions)) {
                    Object.entries(categoryData.snippets).forEach(([name, snippet]) => {
                        const item = this.createCompletionItem(snippet, position);
                        if (item) {
                            completionItems.push(item);
                        }
                    });
                }
            });

            return completionItems;
        } catch (error) {
            console.error('Error in provideCompletionItems:', error);
            return [];
        }
    }

    private createCompletionItem(
        snippet: SnippetDefinition, 
        position: vscode.Position
    ): vscode.CompletionItem | null {
        try {
            const item = new vscode.CompletionItem(
                snippet.prefix,
                vscode.CompletionItemKind.Snippet
            );

            const snippetBody = Array.isArray(snippet.body) 
                ? snippet.body.join('\n')
                : snippet.body;

            item.insertText = new vscode.SnippetString(snippetBody);
            item.documentation = new vscode.MarkdownString(snippet.description);
            
            // 'egov-' 문자열을 대체하기 위한 범위 설정
            const startPos = position.translate(0, -5);
            item.range = new vscode.Range(startPos, position);
            
            // 우선순위 설정
            item.sortText = '0' + snippet.prefix; // 스니펫을 상단에 표시
            
            return item;
        } catch (error) {
            console.error('Error creating completion item:', error);
            return null;
        }
    }

    private matchesConditions(
        fileName: string, 
        fileContent: string, 
        conditions: SnippetConditions
    ): boolean {
        try {
            if (!conditions) {
                return true;
            }

            if (conditions.fileName && conditions.fileName.length > 0) {
                const fileNameMatch = conditions.fileName.some(pattern => 
                    fileName.toLowerCase().includes(pattern.toLowerCase())
                );
                if (!fileNameMatch) {
                    return false;
                }
            }

            if (conditions.fileContent && conditions.fileContent.length > 0) {
                const contentMatch = conditions.fileContent.some(pattern =>
                    fileContent.includes(pattern)
                );
                if (!contentMatch) {
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('Error in matchesConditions:', error);
            return false;
        }
    }

}

/**
 * Register the snippet provider with VS Code.
 */
export function registerSnippetProvider(context: vscode.ExtensionContext): void {
    const provider = new EgovSnippetProvider(context.extensionPath);
    
    // XML 파일을 위한 더 구체적인 언어 모드 추가
    const documentSelectors = [
        { language: 'java' },
        { language: 'xml' },
        // MyBatis mapper 파일을 위한 추가 식별자
        { pattern: '**/*Mapper.xml' },
        { pattern: '**/*_SQL.xml' }
    ];

    for (const selector of documentSelectors) {
        context.subscriptions.push(
            vscode.languages.registerCompletionItemProvider(
                selector,
                provider,
                '-'
            )
        );
    }
} 
