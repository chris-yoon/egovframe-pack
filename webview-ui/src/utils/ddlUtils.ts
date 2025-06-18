// DDL 유효성 검사 및 파싱 유틸리티

export interface DDLValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export interface ParsedColumn {
    name: string;
    dataType: string;
    isPrimaryKey: boolean;
    isNotNull: boolean;
    hasDefault: boolean;
    defaultValue?: string;
    isAutoIncrement: boolean;
    isUnique: boolean;
    size?: number;
}

export interface ParsedDDL {
    tableName: string;
    columns: ParsedColumn[];
    primaryKeys: string[];
    hasValidStructure: boolean;
}

/**
 * 강력한 DDL 유효성 검사
 */
export function validateDDL(ddl: string): DDLValidationResult {
    const result: DDLValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
    };

    if (!ddl || !ddl.trim()) {
        result.isValid = false;
        result.errors.push('DDL is empty');
        return result;
    }

    const trimmed = ddl.trim();

    // 1. CREATE TABLE 문법 확인
    if (!trimmed.toUpperCase().includes('CREATE TABLE')) {
        result.isValid = false;
        result.errors.push('DDL must start with CREATE TABLE statement');
        return result;
    }

    // 2. 테이블명 추출 및 검증
    const tableNameMatch = /CREATE\s+TABLE\s+[`"]?(\w+)[`"]?\s*\(/i.exec(trimmed);
    if (!tableNameMatch) {
        result.isValid = false;
        result.errors.push('Invalid table name or missing opening parenthesis');
        return result;
    }

    const tableName = tableNameMatch[1];
    if (!isValidTableName(tableName)) {
        result.isValid = false;
        result.errors.push(`Invalid table name: ${tableName}. Table name must start with a letter and contain only letters, numbers, and underscores`);
    }

    // 3. 괄호 쌍 확인
    const openParens = (trimmed.match(/\(/g) || []).length;
    const closeParens = (trimmed.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
        result.isValid = false;
        result.errors.push(`Unmatched parentheses: ${openParens} opening, ${closeParens} closing`);
    }

    // 4. 컬럼 정의 추출 및 검증
    const columnDefinitionsMatch = /\((.*)\)/s.exec(trimmed);
    if (!columnDefinitionsMatch || !columnDefinitionsMatch[1].trim()) {
        result.isValid = false;
        result.errors.push('No column definitions found inside parentheses');
        return result;
    }

    const columnDefinitions = columnDefinitionsMatch[1];
    const columns = parseColumns(columnDefinitions);

    if (columns.length === 0) {
        result.isValid = false;
        result.errors.push('No valid columns found in DDL');
    }

    // 5. 컬럼별 유효성 검사
    const columnNames = new Set<string>();
    let hasPrimaryKey = false;

    for (const column of columns) {
        // 중복 컬럼명 검사
        if (columnNames.has(column.name.toLowerCase())) {
            result.isValid = false;
            result.errors.push(`Duplicate column name: ${column.name}`);
        }
        columnNames.add(column.name.toLowerCase());

        // 컬럼명 유효성 검사
        if (!isValidColumnName(column.name)) {
            result.isValid = false;
            result.errors.push(`Invalid column name: ${column.name}. Column name must start with a letter and contain only letters, numbers, and underscores`);
        }

        // 데이터 타입 유효성 검사
        if (!isValidDataType(column.dataType)) {
            result.warnings.push(`Unsupported or unusual data type: ${column.dataType} for column ${column.name}`);
        }

        // PRIMARY KEY 검사
        if (column.isPrimaryKey) {
            hasPrimaryKey = true;
        }
    }

    // 6. PRIMARY KEY 검사
    if (!hasPrimaryKey) {
        result.warnings.push('No primary key defined. Consider adding a primary key for better performance');
    }

    // 7. 전체적인 DDL 구문 검사
    if (!isValidDDLSyntax(trimmed)) {
        result.warnings.push('DDL syntax may have issues. Please verify the statement');
    }

    return result;
}

/**
 * 컬럼 정의 파싱
 */
function parseColumns(columnDefinitions: string): ParsedColumn[] {
    const columns: ParsedColumn[] = [];
    
    // PRIMARY KEY 제약조건 찾기
    const pkConstraintMatch = /PRIMARY\s+KEY\s*\(([^)]+)\)/i.exec(columnDefinitions);
    const primaryKeyColumns = pkConstraintMatch 
        ? pkConstraintMatch[1].split(',').map(col => col.trim().replace(/[`"']/g, ''))
        : [];

    // 컬럼 정의를 개별 컬럼으로 분리
    const columnsArray = columnDefinitions
        .split(/,(?![^(]*\))/)
        .map(column => column.trim())
        .filter(column => {
            const upperColumn = column.toUpperCase();
            return column && 
                   !upperColumn.startsWith('PRIMARY KEY') && 
                   !upperColumn.startsWith('UNIQUE KEY') && 
                   !upperColumn.startsWith('KEY') && 
                   !upperColumn.startsWith('CONSTRAINT') &&
                   !upperColumn.startsWith('INDEX') &&
                   !upperColumn.startsWith('FOREIGN KEY');
        });

    for (const columnDef of columnsArray) {
        const column = parseColumn(columnDef, primaryKeyColumns);
        if (column) {
            columns.push(column);
        }
    }

    return columns;
}

/**
 * 개별 컬럼 파싱
 */
function parseColumn(columnDef: string, primaryKeyColumns: string[]): ParsedColumn | null {
    const trimmed = columnDef.trim();
    const parts = trimmed.split(/\s+/);
    
    if (parts.length < 2) {
        return null;
    }

    const columnName = parts[0].replace(/[`"']/g, '');
    const dataTypePart = parts[1];
    
    // 데이터 타입과 크기 파싱
    const dataTypeMatch = /^(\w+)(?:\((\d+)(?:,\d+)?\))?/i.exec(dataTypePart);
    if (!dataTypeMatch) {
        return null;
    }

    const dataType = dataTypeMatch[1].toUpperCase();
    const size = dataTypeMatch[2] ? parseInt(dataTypeMatch[2]) : undefined;

    const upperColumnDef = trimmed.toUpperCase();
    
    return {
        name: columnName,
        dataType: dataType,
        isPrimaryKey: primaryKeyColumns.includes(columnName) || upperColumnDef.includes('PRIMARY KEY'),
        isNotNull: upperColumnDef.includes('NOT NULL'),
        hasDefault: upperColumnDef.includes('DEFAULT'),
        defaultValue: extractDefaultValue(trimmed),
        isAutoIncrement: upperColumnDef.includes('AUTO_INCREMENT') || upperColumnDef.includes('AUTOINCREMENT'),
        isUnique: upperColumnDef.includes('UNIQUE'),
        size: size
    };
}

/**
 * DEFAULT 값 추출
 */
function extractDefaultValue(columnDef: string): string | undefined {
    const defaultMatch = /DEFAULT\s+([^,\s)]+)/i.exec(columnDef);
    return defaultMatch ? defaultMatch[1].replace(/['"]/g, '') : undefined;
}

/**
 * 테이블명 유효성 검사
 */
function isValidTableName(name: string): boolean {
    // 첫 글자는 문자, 이후는 문자, 숫자, 언더스코어만 허용
    return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name) && name.length <= 64;
}

/**
 * 컬럼명 유효성 검사
 */
function isValidColumnName(name: string): boolean {
    // 첫 글자는 문자, 이후는 문자, 숫자, 언더스코어만 허용
    return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name) && name.length <= 64;
}

/**
 * 데이터 타입 유효성 검사
 */
function isValidDataType(dataType: string): boolean {
    const supportedTypes = [
        'VARCHAR', 'CHAR', 'TEXT', 'MEDIUMTEXT', 'LONGTEXT',
        'INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT',
        'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'REAL',
        'DATE', 'TIME', 'DATETIME', 'TIMESTAMP', 'YEAR',
        'BOOLEAN', 'BOOL', 'BIT',
        'BLOB', 'MEDIUMBLOB', 'LONGBLOB',
        'JSON', 'ENUM', 'SET'
    ];
    
    return supportedTypes.includes(dataType.toUpperCase());
}

/**
 * 전체 DDL 구문 유효성 검사
 */
function isValidDDLSyntax(ddl: string): boolean {
    // 기본적인 SQL 구문 오류 검사
    const invalidPatterns = [
        /;;+/,  // 연속된 세미콜론
        /,\s*,/, // 연속된 쉼표
        /\(\s*,/, // 여는 괄호 바로 뒤의 쉼표
        /,\s*\)/, // 닫는 괄호 바로 앞의 쉼표
    ];

    return !invalidPatterns.some(pattern => pattern.test(ddl));
}

/**
 * DDL 파싱 (간단한 버전)
 */
export function parseDDL(ddl: string): ParsedDDL | null {
    const validation = validateDDL(ddl);
    
    if (!validation.isValid) {
        return null;
    }

    const tableNameMatch = /CREATE\s+TABLE\s+[`"]?(\w+)[`"]?\s*\(/i.exec(ddl.trim());
    const tableName = tableNameMatch ? tableNameMatch[1] : '';

    const columnDefinitionsMatch = /\((.*)\)/s.exec(ddl.trim());
    const columnDefinitions = columnDefinitionsMatch ? columnDefinitionsMatch[1] : '';
    
    const columns = parseColumns(columnDefinitions);
    const primaryKeys = columns.filter(col => col.isPrimaryKey).map(col => col.name);

    return {
        tableName,
        columns,
        primaryKeys,
        hasValidStructure: validation.isValid
    };
}

/**
 * 샘플 DDL 생성
 */
export function generateSampleDDL(): string {
    return `CREATE TABLE board (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    author VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    view_count INT DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE
);`;
} 