# Project NexusFlow

Project NexusFlow is a visual workflow automation platform that allows users to create, connect, and manage workflow nodes through an interactive canvas.

The frontend provides a visual interface for building workflows, configuring node parameters, monitoring workflow execution, and viewing live execution updates.

## Features

- **Visual Workflow Canvas**  
  Build workflows using an interactive node-based canvas.

- **Drag-and-Drop Nodes**  
  Add and arrange different workflow nodes on the canvas.

- **Node Connections**  
  Connect nodes to define the flow and execution order.

- **Node Configuration**  
  Configure parameters and inputs for individual nodes.

- **Live Dashboard**  
  Monitor workflow execution and view real-time status updates.

- **Reusable Node Registry**  
  Centralized node definitions make it easier to manage and extend available workflow nodes.

- **Sample Workflows**  
  Includes sample graph configurations for testing and demonstrating workflows.

- **Live Store**  
  Manages workflow and execution state across the frontend.

- **Testing**  
  Includes tests for frontend workflow-related functionality.

## Tech Stack

### Frontend

- React
- Vite
- React Flow
- JavaScript
- RxJS
- CSS

### Development Tools

- Git
- GitHub
- Visual Studio Code
- npm

## Project Structure

```text
frontend/
│
├── src/
│   ├── components/
│   │   ├── LiveDashboard.jsx
│   │   ├── ParamInput.jsx
│   │   └── ...
│   │
│   ├── pages/
│   │   ├── Canvas.jsx
│   │   └── ...
│   │
│   ├── lib/
│   │   ├── liveStore.test.js
│   │   ├── nodeRegistry.js
│   │   └── sampleGraphs.js
│   │
│   └── ...
│
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js
- npm
- Git

### Installation

Clone the repository:

```bash
git clone https://github.com/upinder28/Project-NexusFlow.git
```

Navigate to the frontend directory:

```bash
cd Project-NexusFlow/frontend
```

Install dependencies:

```bash
npm install
```

### Run the Development Server

Start the frontend using:

```bash
npm start
```

The application will be available at:

```text
http://localhost:5173
```

> The exact port may vary depending on the Vite configuration.

## Available Scripts

### `npm start`

Starts the Vite development server.

### `npm run build`

Creates an optimized production build.

### `npm run preview`

Runs the production build locally for preview.

### `npm test`

Runs the available frontend tests if the project's test configuration is enabled.

## Core Frontend Components

### Canvas

The main workflow-building interface. It provides the interactive React Flow canvas where users can add, configure, move, and connect workflow nodes.

### Live Dashboard

Displays workflow execution information and live status updates.

### ParamInput

Provides reusable UI components for configuring node parameters and inputs.

### Node Registry

`nodeRegistry.js` maintains the available node definitions and their associated configuration.

### Sample Graphs

`sampleGraphs.js` contains predefined workflow graphs that can be used for testing and demonstrating the workflow system.

### Live Store

The live store manages frontend state related to workflow execution and live updates.

## Development Workflow

The project follows a feature-branch workflow.

Current development branch:

```text
Swati-Sharma
```

Typical workflow:

```bash
git checkout Swati-Sharma
git pull origin Swati-Sharma

# Make changes

git status
git add .
git commit -m "Describe your changes"
git push origin Swati-Sharma
```

## Testing

Before pushing changes, it is recommended to verify the application locally:

```bash
npm start
```

Then test:

- Workflow creation
- Node addition
- Node connections
- Parameter configuration
- Dashboard updates
- Workflow execution states
- Error handling

Run the project's tests when applicable:

```bash
npm test
```

## Build

To create a production build:

```bash
npm run build
```

The generated production files can then be served using a suitable web server or deployment platform.

## Future Improvements

- Add more workflow node types
- Improve workflow validation
- Add advanced node configuration options
- Improve real-time execution monitoring
- Add workflow persistence
- Improve error and status visualization
- Add more automated frontend tests

## Contributors

Developed as part of the Project NexusFlow team.

