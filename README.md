# NexusFlow – Visual IoT Telemetry & Rule Engine

## About the Project

NexusFlow is a visual IoT workflow application that allows users to build data processing pipelines using a drag-and-drop interface. It helps simplify sensor data processing by connecting different nodes instead of hardcoding every rule.

The project uses React Flow to build workflows, Node.js and RxJS to process the graph, and MongoDB Time-Series collections to store sensor telemetry.

## Key Features

- **Visual Workflow Builder:** Create and connect nodes through an interactive canvas.
- **Custom Node Library:** Includes sensor sources, HTTP sources, simulators, mathematical operations, filters, and alert nodes.
- **Graph Serialization:** Convert workflows into JSON containing nodes and connections.
- **Stream Compiler:** Parse the workflow graph and prepare the corresponding processing logic.
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

1. Users create a workflow by adding nodes to the canvas.
2. Nodes are connected to define the data processing sequence.
3. The complete workflow is serialized into JSON.
4. The backend compiler reads the graph and its connections.
5. Sensor readings enter the system through the ingestion API.
6. RxJS streams process data according to the configured operations.
7. The alert engine checks conditions and generates relevant events.

## Example Workflow

**Turbine Sensor → Moving Average → SMS Alert**

A sensor provides temperature readings, the Moving Average node processes the readings, and the SMS Alert node checks the processed value against the configured threshold.

The current alert implementation logs alert messages; actual SMS delivery is not configured.

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
