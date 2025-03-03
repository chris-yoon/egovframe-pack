# eGovFrame Initializr VS Code Extension

## Overview
The eGovFrame Initializr VS Code Extension enables developers to use eGovernment Standard Framework Development Environment features directly within Visual Studio Code. This extension provides DDL-based CRUD code generation and template-based project creation capabilities.

![Demo](assets/demo.gif)

## Key Features

### Project Creation
Create projects based on the eGovernment Standard Framework with various templates:
- eGovFrame Web Project
- Simple Homepage (Backend/Frontend)
- Portal Site
- Enterprise Business
- Common Component All-in-One
- Boot Projects

### CRUD Code Generation
Generate code from DDL (Data Definition Language) scripts:
- Backend components (Controllers, Services, DAOs, Value Objects)
- SQL Mapper files with CRUD operations
- Frontend views (JSP/Thymeleaf)

### Code Snippets
Built-in snippets for:
- MyBatis SQL statements (select, insert, update, delete)
- Spring configuration beans
- Common eGovFrame patterns

### Configuration Generation
Generate various configuration files:
- Cache
- Datasource
- ID Generation
- Logging
- Properties
- Scheduling
- Transaction

## Installation

### VS Code Marketplace
Install directly from the Visual Studio Code Marketplace

### Manual Installation (VSIX)
1. Download the `.vsix` file
2. Open VS Code
3. Press `Ctrl+Shift+X` to open Extensions
4. Click `...` (More Actions) → `Install from VSIX`
5. Select the downloaded file

## Usage

### Via Command Palette (`Ctrl+Shift+P`)
- Type "eGovFrame" to see available commands
- Select desired operation (create project, generate code, etc.)

### Via Context Menu
- Right-click in editor or explorer
- Select eGovFrame operations from context menu

### Via Sidebar
1. Click eGovFrame icon in Activity Bar
2. Use dedicated views for:
   - Project Generation
   - DDL-based Code Generation
   - Configuration Generation
   - Code Snippets

### Project Creation Steps
1. Open Command Palette or Sidebar
2. Select "eGovFrame: Start > New Project"
3. Choose project template
4. Enter project details (name, group ID)
5. Select target location

### CRUD Generation Steps
1. Open SQL file containing DDL
2. Select DDL statement
3. Right-click → "eGovFrame: CRUD Code Generator from DDL"
4. Configure generation options
5. Generated code will be created in target location

## Configuration

Access settings through:
- File > Preferences > Settings
- Search for "eGovFrame Initializr"

Available settings:
- Default Package Name
- Template Locations
- Other customization options

## Requirements

### Required Software
- Visual Studio Code ^1.75.0
- Node.js 20.x or higher
- npm (Node Package Manager)

### Required Libraries

#### Node.js Dependencies
The following npm packages will be automatically installed when you run `npm install`:

1. Runtime Dependencies:
   - Database Connectors:
     - oracledb (^6.7.2)
     - mysql2 (^3.12.0)
     - pg (PostgreSQL) (^8.13.3)
   - Utility Libraries:
     - handlebars (^4.7.8)
     - fs-extra (^11.2.0)
     - extract-zip (^2.0.1)
     - yauzl (^3.1.3)

2. Development Dependencies:
   - Type Definitions:
     - @types/fs-extra (^11.0.4)
     - @types/handlebars (^4.1.0)
     - @types/yauzl (^2.10.3)
     - @types/oracledb (^6.5.3)
     - @types/pg (^8.11.11)
   - Testing and Linting:
     - @types/mocha (^10.0.7)
     - @types/sinon (^10.0.20)
     - @typescript-eslint/eslint-plugin (^7.14.1)
     - @typescript-eslint/parser (^7.11.0)
     - eslint (^8.57.0)

### Installation Steps

1. Install Node.js Dependencies
   ```bash
   # Install all dependencies (both runtime and development)
   npm install

   # If you need to install dependencies separately:
   # Runtime dependencies
   npm install handlebars fs-extra extract-zip yauzl
   npm install oracledb mysql2 pg

   # Development dependencies
   npm install --save-dev @types/fs-extra @types/handlebars @types/yauzl
   npm install --save-dev @types/oracledb @types/pg
   npm install --save-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint
   ```

2. Build Extension
   ```bash
   npm run clean
   npm run pretest
   npm run compile
   ```

## License

Apache License 2.0
