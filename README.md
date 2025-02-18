# eGovFrame Initializr VS Code Extension

## Overview
The eGovFrame Initializr VS Code Extension allows developers to utilize functionalities provided by the eGovernment Standard Framework Development Environment (Eclipse RCP) directly within Visual Studio Code. This extension supports DDL-based CRUD code generation and template-based project creation, enabling a seamless development experience in a lightweight editor.

![Demo](assets/demo.gif)

## Key Features

### Project Creation
- Create projects based on the eGovernment Standard Framework.
- Includes templates for:
  - Sample Bulletin Board
  - Simple Homepage
  - Portal Site
  - Enterprise Business
  - Common Component All-in-One
  - Mobile Projects
  - Device API Web Projects
  - Boot Projects (Sample Bulletin Board, Simple Homepage, MSA projects)
  - Batch Projects (File-based, DB-based)

### CRUD Code Generation
- Automatically generate CRUD code from DDL (Data Definition Language) scripts.
- Supports backend code generation for:
  - Controllers
  - Services
  - DAOs
  - Value Objects
  - SQL Mappers
- Frontend code generation for JSP and Thymeleaf.
- Easily generate SQL Mapper files including Insert, Update, and Select queries.

### Custom Velocity Template Support
- Developers can upload custom Velocity templates and generate files based on DDL.
- Download template context as JSON for creating customized templates.

### Configuration File Generation
- Generate configuration files for:
  - Cache
  - Datasource
  - ID Generation
  - Logging
  - Properties
  - Scheduling
  - Transaction
- Supports XML and Java-based configuration file generation.

## Installation

### From the VSIX File
1. Download the `.vsix` file.
2. Open Visual Studio Code.
3. Go to the Extensions view by clicking on the Extensions icon in the Activity Bar or pressing `Ctrl+Shift+X`.
4. Click on the three dots at the top right corner and select `Install from VSIX...`.
5. Select the downloaded `.vsix` file to install.

### From the VS Code Marketplace
This extension can also be installed directly from the Visual Studio Code Marketplace.

## Usage

### Command Palette
- Open the Command Palette (`Ctrl+Shift+P`).
- Type `eGovFrame` to see all available commands.

### CRUD Code Generator from DDL
1. Open a SQL file and select a DDL statement.
2. Right-click and choose `eGovFrame: CRUD Code Generator from DDL` from the context menu.
3. The extension will generate the necessary CRUD code based on the DDL.

### Project Creation
1. Open the Command Palette (`Ctrl+Shift+P`) or Right-click on a folder in the Explorer view.
2. Choose `eGovFrame: Start > New Project`.
3. Select a template and follow the prompts to create a new project.

### Configuration Generation
1. Right-click on a folder or file in the Explorer view.
2. Select `eGovFrame: Generate Config` from the context menu.
3. Choose the configuration type and follow the prompts to generate the configuration file.

### Using the Sidebar

#### Project Creation via Sidebar
1. Click on the `eGovFrame` icon in the Activity Bar to open the eGovFrame Sidebar.
2. In the `Generate Projects` view, browse through the available project templates.
3. Select a template and click on it to start the project creation process.
4. Follow the prompts to generate a new project in the selected directory.

#### CRUD Code Generation via Sidebar
1. Click on the `eGovFrame` icon in the Activity Bar to open the eGovFrame Sidebar.
2. In the `Generate Code from DDL` view, click on the relevant button to insert a sample DDL or use your own.
3. Select a DDL statement in your SQL file, then click on the corresponding button in the Sidebar to generate CRUD code.

#### Configuration Generation via Sidebar
1. Click on the `eGovFrame` icon in the Activity Bar to open the eGovFrame Sidebar.
2. In the `Generate Configurations` view, browse through the available configuration templates.
3. Select a configuration type, click on it, and follow the prompts to generate the configuration file in the selected directory. 

This Sidebar integration provides a more visual and convenient way to access the extension's features directly from the VS Code interface.

## Configuration

### Default Package Name
- The default package name for the generated code can be set via the VS Code settings:
  - Go to `File > Preferences > Settings`.
  - Search for `eGovFrame Initializr`.
  - Set the `defaultPackageName` according to your preference.