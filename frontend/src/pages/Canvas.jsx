import { useState, useCallback } from 'react';
import ReactFlow, { addEdge, Background, Controls, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import SensorNode from '../nodes/SensorNode';
import FilterNode from '../nodes/FilterNode';
import AlertNode from '../nodes/AlertNode';

const nodeTypes = { sensor: SensorNode, filter: FilterNode, alert: AlertNode };

const initialNodes = [
  { id: '1', type: 'sensor', position: { x: 50, y: 150 }, data: { label: 'Turbine Sensor' } },
  { id: '2', type: 'filter', position: { x: 280, y: 150 }, data: { label: 'Moving Average' } },
  { id: '3', type: 'alert', position: { x: 510, y: 150 }, data: { label: 'SMS Alert' } },
];

export default function Canvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0d1117' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#333" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
