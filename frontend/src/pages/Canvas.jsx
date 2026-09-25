import { useState, useCallback, useEffect } from 'react';
import ReactFlow, { addEdge, Background, Controls, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import SensorNode from '../nodes/SensorNode';
import FilterNode from '../nodes/FilterNode';
import AlertNode from '../nodes/AlertNode';

const nodeTypes = { sensor: SensorNode, filter: FilterNode, alert: AlertNode };

const initialNodes = [
  { id: '1', type: 'sensor', position: { x: 50, y: 150 }, data: { label: 'Turbine Sensor', deviceId: 'device-1' } },
  { id: '2', type: 'filter', position: { x: 280, y: 150 }, data: { label: 'Moving Average' } },
  { id: '3', type: 'alert', position: { x: 510, y: 150 }, data: { label: 'SMS Alert' } },
];

export default function Canvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
 ]);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:${import.meta.env.VITE_PORT || 5000}`);

    ws.onmessage = (e) => {
      const { metadata, value } = JSON.parse(e.data);
      setNodes((nds) =>
       nds.map((node) => {
        if (
           node.type === 'sensor' &&
           node.data.deviceId === metadata.deviceId
          ) {
            return {
              ...node,
              data: { ...node.data, value },
            };
          }
 
          if (node.id === '2' || node.id === '3') {
          return {
             ...node,
            data: { ...node.data, value: Number(value) },
         };
        }

       return node;
      })
     );
    };

    return () => ws.close();
  }, []);

  const updateSensorValue = (value) => {
  setNodes((nds) =>
    nds.map((node) => {
      if (node.id === '1' || node.id === '2' || node.id === '3') {
        return {
          ...node,
          data: {
            ...node.data,
            value: Number(value),
          },
        };
      }

      return node;
    })
  );
};


  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0d1117' }}>
      <ReactFlow
        nodes={nodes.map((node) =>
        node.id === '1'
        ?{
          ...node,
            data: {
             ...node.data,
             onChange: updateSensorValue,
            },
          }
       : node
      )}
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
