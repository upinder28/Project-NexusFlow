import { BaseEdge, getBezierPath } from 'reactflow';


export default function GlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, data }) {
  const [path] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const color = style.stroke || '#58a6ff';
  const active = data?.activeAt > 0;
  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />
      {active && (
        <g key={data.activeAt} pointerEvents="none">
          <path d={path} className="nf-glow" style={{ stroke: color }} />
          <circle r="3.5" fill={color} className="nf-dot">
            <animateMotion dur="0.7s" path={path} fill="freeze" />
          </circle>
        </g>
      )}
    </>
  );
}
