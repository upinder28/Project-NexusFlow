# NexusFlow – Visual IoT Telemetry & Rule Engine

## About the Project

NexusFlow is a visual IoT workflow application that allows users to create, configure, and execute data processing pipelines using a drag-and-drop interface. It simplifies sensor data processing by allowing users to connect different nodes and define how data should flow through the system instead of manually hardcoding every processing rule.
The application provides a flexible environment where users can combine different data sources, mathematical operations, filters, and alert nodes to build customized workflows. These workflows are converted into a structured JSON format and processed by the backend stream compiler.
The project uses React Flow to build interactive workflows, Node.js and Express to handle backend operations, RxJS to process real-time data streams, MongoDB Time-Series collections to store sensor telemetry, and WebSockets for real-time communication between the frontend and backend.

## Key Features

- **Visual Workflow Builder:** Create and connect nodes through an interactive canvas.
- **Custom Node Library:** Includes sensor sources, HTTP sources, simulators, mathematical operations, filters, and alert nodes.
- **Graph Serialization:** Convert workflows into JSON containing nodes and connections.
- **Stream Compiler:** Parses the serialized workflow graph and builds RxJS processing pipelines based on the configured nodes and connections.
- **Telemetry Ingestion:** Receive sensor readings through Express APIs.
- **Time-Series Storage:** Store telemetry data with timestamps and sensor information.
- **WebSocket Communication:** Support real-time communication between the backend and frontend.
- **Alert Engine:** Check configured conditions and generate alert events.

## Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React.js, React Flow, JavaScript, CSS |
| Backend | Node.js, Express.js |
| Stream Processing | RxJS |
| Database | MongoDB, Mongoose |
| Communication | WebSockets |
| API Requests | Axios |

## How It Works

1. Users create a workflow by adding different nodes to the React Flow canvas.
2. Nodes are connected to define the sequence and direction of data processing.
3. The complete workflow is serialized into JSON containing node configurations and connections.
4. The backend compiler receives and parses the serialized graph to understand the workflow structure.
5. The stream compiler identifies the configured operations and creates the corresponding RxJS processing pipeline.
6. Sensor readings enter the system through the telemetry ingestion API.
7. Incoming data is processed through the configured operations, mathematical calculations, and filters.
8. The alert engine evaluates processed values against the configured rules and threshold conditions.
9. WebSocket communication transfers real-time telemetry and processing updates to the frontend.
10. The dashboard displays live sensor readings, processed values, and relevant alert information.

## Example Workflow

**Turbine Sensor → Moving Average → SMS Alert**

A sensor provides temperature readings to the workflow through the Turbine Sensor node. The Moving Average node processes incoming readings and calculates their average over a configured window. The processed value is then passed to the SMS Alert node, which checks whether the configured threshold condition is satisfied.
For example, if the temperature threshold is configured as 80°C, the alert engine checks the processed temperature value against this limit. When the condition is satisfied, an alert message is generated and logged by the backend.
The current alert implementation generates and logs alert messages; actual SMS delivery through an external messaging service is not configured.

## Project Development

### Week 1 – Initial Setup
- Set up the React application and React Flow canvas.
- Created the Node.js and Express backend.
- Set up the MongoDB connection and telemetry data model.
- Started implementing the telemetry ingestion API.

### Week 2 – Workflow Builder and Stream Processing
- Added custom nodes for data sources, mathematical operations, filters, and alerts.
- Implemented graph serialization and backend graph parsing.
- Developed the stream compiler and RxJS processing logic.
- Integrated WebSocket communication.

### Week 3 – Live Rule Execution and Dashboards

- Connected incoming WebSocket telemetry to dynamically compiled RxJS pipelines for real-time rule evaluation in memory.
- Implemented live rule execution to process incoming sensor readings according to the configured workflow.
- Developed real-time dashboards using Recharts or Chart.js to visualize incoming telemetry data.
- Integrated WebSocket streams with dashboard components to display live sensor readings and processed values.

 ### Week 4 – Webhooks, Alerting, and Final Improvements

- Improved the alert engine to trigger alerts when configured rules and threshold conditions are satisfied.
- Added support for alert actions through the backend, with alert messages generated when anomalies are detected.
- Refined the workflow builder to improve the visualization and usability of connected nodes.
- Improved the interaction between the frontend workflow canvas and backend stream-processing engine.
- Tested the complete workflow, from telemetry ingestion and data processing to rule evaluation and alert generation.
- Completed final testing and improvements to make the application more reliable and easier to use.

## Final Project Review

NexusFlow combines a visual workflow builder with a backend stream-processing engine to simplify IoT telemetry processing. Users can create workflows by connecting different nodes, while the backend interprets the configured workflow and dynamically builds RxJS pipelines to process incoming sensor data.
The project integrates React Flow, Node.js, Express, RxJS, MongoDB, and WebSockets to support workflow configuration, telemetry ingestion, data processing, real-time communication, and alert generation.
The main focus of the project is to connect visual workflow configuration with real-time data processing. It demonstrates how users can define processing logic through connected nodes instead of manually hardcoding every business rule. The application also provides a modular structure that allows different data sources, processing operations, and alert conditions to work together within a single workflow.

## Running the Project

### Prerequisites
- Node.js and npm
- MongoDB

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` directory using the following configuration:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/nexusflow
```

Start the backend:

```bash
npm start
```

### Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm start
```

Open the local URL displayed in the terminal to access the application.

## Project Goal

NexusFlow aims to make IoT data pipelines easier to create, configure, and process through a visual workflow builder and a modular backend.
It focuses on reducing the need for manually writing individual data processing rules by allowing users to connect different nodes and define the complete processing flow visually.
By combining workflow configuration, real-time telemetry ingestion, RxJS stream processing, MongoDB storage, and rule-based alert generation, the project provides a flexible approach to building and managing IoT data processing workflows.
