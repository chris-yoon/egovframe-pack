import { Column, getJavaClassName } from './codeGeneratorUtils';

interface ParsedDDL {
    tableName: string;
    attributes: Column[];
    pkAttributes: Column[];
}

// snake_case를 camelCase로 변환하는 함수
function convertToCamelCase(str: string): string {
    return str.toLowerCase().replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

// camelCase를 PascalCase로 변환하는 함수
function convertCamelcaseToPascalcase(name: string): string {
    if (!name) return name;
    return name.charAt(0).toUpperCase() + name.slice(1);
}

// DDL 파싱 함수
export function parseDDL(ddl: string): ParsedDDL {
    // 공백 정규화
    ddl = ddl.replace(/\s+/g, ' ').trim();

    // 테이블 이름 추출
    const tableNameMatch = ddl.match(/CREATE TABLE (\w+)/i);
    if (!tableNameMatch) {
        throw new Error('Unable to parse table name from DDL');
    }
    const tableName = convertCamelcaseToPascalcase(tableNameMatch[1].toLowerCase());

    // 컬럼 정의 추출
    const columnDefinitionsMatch = ddl.match(/\((.*)\)/s);
    if (!columnDefinitionsMatch) {
        throw new Error('Unable to parse column definitions from DDL');
    }

    // 컬럼 정의를 개별 컬럼으로 분리
    const columnDefinitions = columnDefinitionsMatch[1];
    const columnsArray = columnDefinitions
        .split(/,(?![^\(]*\))/)
        .map(column => column.trim())
        .filter(column => column && !column.startsWith('CONSTRAINT') && !column.startsWith('PRIMARY KEY'));

    const attributes: Column[] = [];
    const pkAttributes: Column[] = [];

    // 각 컬럼 파싱
    columnsArray.forEach(columnDef => {
        // 기본 컬럼 정보 추출
        const parts = columnDef.split(' ');
        const columnName = parts[0].replace(/[`"']/g, ''); // 따옴표 제거
        const rawDataType = parts[1].toUpperCase();
        
        // 데이터 타입에서 크기 정보 제거
        const dataType = rawDataType.match(/^\w+/)?.[0] || rawDataType;
        
        // PRIMARY KEY 확인
        const isPrimaryKey = columnDef.toUpperCase().includes('PRIMARY KEY');
        
        // camelCase 이름 생성
        const ccName = convertToCamelCase(columnName);
        
        // Column 객체 생성
        const column: Column = {
            ccName,
            columnName,
            isPrimaryKey,
            pcName: convertCamelcaseToPascalcase(ccName),
            dataType,
            javaType: getJavaClassName(dataType)
        };

        attributes.push(column);
        if (isPrimaryKey) {
            pkAttributes.push(column);
        }
    });

    // PRIMARY KEY 제약조건이 별도로 정의된 경우 처리
    const pkConstraintMatch = ddl.match(/PRIMARY KEY\s*\((.*?)\)/i);
    if (pkConstraintMatch) {
        const pkColumns = pkConstraintMatch[1]
            .split(',')
            .map(col => col.trim().replace(/[`"']/g, ''));

        attributes.forEach(column => {
            if (pkColumns.includes(column.columnName)) {
                column.isPrimaryKey = true;
                if (!pkAttributes.includes(column)) {
                    pkAttributes.push(column);
                }
            }
        });
    }

    // 결과가 비어있는지 확인
    if (attributes.length === 0) {
        throw new Error('No valid columns found in DDL');
    }

    return { tableName, attributes, pkAttributes };
}

// DDL 유효성 검사 함수
export function validateDDL(ddl: string): boolean {
    if (!ddl) {
        return false;
    }

    // CREATE TABLE 문법 확인
    if (!ddl.toUpperCase().includes('CREATE TABLE')) {
        return false;
    }

    // 괄호 쌍 확인
    const openParens = (ddl.match(/\(/g) || []).length;
    const closeParens = (ddl.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
        return false;
    }

    // 최소한의 컬럼 정의 확인
    const columnMatch = ddl.match(/\((.*)\)/s);
    if (!columnMatch || !columnMatch[1].trim()) {
        return false;
    }

    return true;
}

// DDL 정규화 함수
export function normalizeDDL(ddl: string): string {
    return ddl
        .replace(/\s+/g, ' ')  // 연속된 공백을 단일 공백으로
        .replace(/\s*,\s*/g, ', ')  // 쉼표 주변 공백 정규화
        .replace(/\s*\(\s*/g, ' (')  // 여는 괄호 주변 공백 정규화
        .replace(/\s*\)\s*/g, ') ')  // 닫는 괄호 주변 공백 정규화
        .replace(/\s*;\s*$/, ';')  // 세미콜론 주변 공백 정규화
        .trim();
}

// 샘플 DDL 생성 함수
export function generateSampleDDL(): string {
    return `CREATE TABLE sample_table (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);`;
}