"use client";

import { useState, useMemo } from "react";
import MasteryBadge from "./MasteryBadge.jsx";

export default function ConceptGraph({ concepts = [], relationships = [], onSelectConcept }) {
  const [selectedId, setSelectedId] = useState(concepts[0]?.id || null);

  // Compute layered layout coordinates for stable, predictable node placement
  const layout = useMemo(() => {
    if (!concepts || concepts.length === 0) return { nodes: [], edges: [], width: 700, height: 500 };

    const nodeCount = concepts.length;
    const width = 760;
    const height = Math.max(520, Math.ceil(nodeCount / 3) * 160 + 100);

    // Build adjacency and in-degree to compute topological depth layers
    const inDegree = {};
    concepts.forEach(c => { inDegree[c.id] = 0; });
    relationships.forEach(r => {
      if (inDegree[r.target] !== undefined) {
        inDegree[r.target] = (inDegree[r.target] || 0) + 1;
      }
    });

    // Group into levels
    const levels = [];
    const assigned = new Set();

    // Level 0: concepts with 0 in-degree (prerequisites)
    let currentLevel = concepts.filter(c => (inDegree[c.id] || 0) === 0).map(c => c.id);
    if (currentLevel.length === 0) currentLevel = [concepts[0].id];

    while (currentLevel.length > 0 && assigned.size < concepts.length) {
      levels.push(currentLevel);
      currentLevel.forEach(id => assigned.add(id));

      const nextLevelCandidates = new Set();
      relationships.forEach(r => {
        if (assigned.has(r.source) && !assigned.has(r.target)) {
          nextLevelCandidates.add(r.target);
        }
      });

      // Also gather any unassigned remaining
      if (nextLevelCandidates.size === 0 && assigned.size < concepts.length) {
        const remaining = concepts.filter(c => !assigned.has(c.id)).map(c => c.id);
        if (remaining.length > 0) nextLevelCandidates.add(remaining[0]);
      }

      currentLevel = Array.from(nextLevelCandidates);
    }

    // Assign (x, y) coordinates
    const nodeCoords = {};
    const totalLevels = levels.length || 1;
    const ySpacing = height / (totalLevels + 1);

    levels.forEach((lvl, lvlIdx) => {
      const y = (lvlIdx + 1) * ySpacing;
      const countInLvl = lvl.length;
      const xSpacing = width / (countInLvl + 1);

      lvl.forEach((cId, colIdx) => {
        nodeCoords[cId] = {
          x: (colIdx + 1) * xSpacing,
          y: y
        };
      });
    });

    // Fallback for any unpositioned concepts
    concepts.forEach((c, idx) => {
      if (!nodeCoords[c.id]) {
        nodeCoords[c.id] = {
          x: ((idx % 3) + 1) * (width / 4),
          y: (Math.floor(idx / 3) + 1) * 140
        };
      }
    });

    const positionedNodes = concepts.map(c => ({
      ...c,
      x: nodeCoords[c.id].x,
      y: nodeCoords[c.id].y
    }));

    const positionedEdges = relationships
      .filter(r => nodeCoords[r.source] && nodeCoords[r.target])
      .map(r => ({
        ...r,
        sourceX: nodeCoords[r.source].x,
        sourceY: nodeCoords[r.source].y,
        targetX: nodeCoords[r.target].x,
        targetY: nodeCoords[r.target].y
      }));

    return { nodes: positionedNodes, edges: positionedEdges, width, height };
  }, [concepts, relationships]);

  const selectedConcept = useMemo(() => {
    return concepts.find(c => c.id === selectedId) || concepts[0] || null;
  }, [concepts, selectedId]);

  const handleNodeClick = (concept) => {
    setSelectedId(concept.id);
    if (onSelectConcept) onSelectConcept(concept);
  };

  const getNodeColor = (concept) => {
    if (concept.status_tier === "mastery" || (concept.mastery_score !== null && concept.mastery_score >= 75)) {
      return "var(--mastery-green)";
    }
    if (concept.status_tier === "developing" || (concept.mastery_score !== null && concept.mastery_score >= 50)) {
      return "var(--mastery-yellow)";
    }
    if (concept.status_tier === "novice" || (concept.mastery_score !== null && concept.mastery_score < 50)) {
      return "var(--mastery-red)";
    }
    return "var(--accent-primary)";
  };

  return (
    <div className="graph-layout">
      {/* Graph Visualizer Canvas */}
      <div className="graph-canvas-wrapper">
        <div className="graph-header-bar">
          <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>🕸️ Concept Hierarchy & Dependencies</span>
          <div className="graph-legend">
            <span className="legend-item"><span className="legend-dot green"></span> Strong</span>
            <span className="legend-item"><span className="legend-dot yellow"></span> Developing</span>
            <span className="legend-item"><span className="legend-dot red"></span> Needs Rev</span>
            <span className="legend-item"><span className="legend-dot neutral"></span> Unassessed</span>
          </div>
        </div>

        <svg
          className="graph-svg-container"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="28"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="var(--border-strong)" />
            </marker>
            <marker
              id="arrowhead-highlight"
              markerWidth="8"
              markerHeight="6"
              refX="28"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="var(--accent-primary)" />
            </marker>
          </defs>

          {/* Directed Edges */}
          {layout.edges.map((edge, idx) => {
            const isConnected = edge.source === selectedId || edge.target === selectedId;
            return (
              <g key={`edge-${idx}`}>
                <line
                  x1={edge.sourceX}
                  y1={edge.sourceY}
                  x2={edge.targetX}
                  y2={edge.targetY}
                  className={`graph-edge ${isConnected ? "highlighted" : ""}`}
                  markerEnd={isConnected ? "url(#arrowhead-highlight)" : "url(#arrowhead)"}
                />
                <text
                  x={(edge.sourceX + edge.targetX) / 2}
                  y={(edge.sourceY + edge.targetY) / 2 - 6}
                  className="graph-edge-label"
                >
                  {edge.relationship === "prerequisite" ? "prereq" : edge.relationship}
                </text>
              </g>
            );
          })}

          {/* Interactive Concept Nodes */}
          {layout.nodes.map((node) => {
            const isSelected = node.id === selectedId;
            const nodeColor = getNodeColor(node);

            return (
              <g
                key={node.id}
                className={`graph-node ${isSelected ? "active-node" : ""}`}
                onClick={() => handleNodeClick(node)}
                transform={`translate(${node.x}, ${node.y})`}
              >
                {/* Outer Glow Ring for Selected */}
                {isSelected && (
                  <circle
                    r="34"
                    fill="none"
                    stroke={nodeColor}
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    opacity="0.8"
                  />
                )}

                {/* Node Circle */}
                <circle
                  r="24"
                  fill="var(--bg-surface)"
                  stroke={nodeColor}
                  strokeWidth={isSelected ? "3.5" : "2.5"}
                />

                {/* Center Core Indicator */}
                <circle
                  r="10"
                  fill={nodeColor}
                  opacity={isSelected ? "1" : "0.75"}
                />

                {/* Node Label */}
                <text
                  y="42"
                  textAnchor="middle"
                  fill="var(--text-main)"
                  fontSize="12px"
                  fontWeight="650"
                >
                  {node.label.length > 20 ? node.label.substring(0, 18) + "…" : node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Side Details Panel */}
      <div className="concept-drawer">
        {selectedConcept ? (
          <>
            <div className="drawer-header">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 750, color: "var(--text-main)" }}>
                  {selectedConcept.label}
                </h3>
              </div>
              <MasteryBadge tier={selectedConcept.status_tier} score={selectedConcept.mastery_score} />
            </div>

            <div className="drawer-body">
              <div>
                <div className="drawer-section-title">Core Definition</div>
                <p className="drawer-text">{selectedConcept.description}</p>
              </div>

              {selectedConcept.explanation && (
                <div>
                  <div className="drawer-section-title">Deep Conceptual Explanation</div>
                  <p className="drawer-text" style={{ whiteSpace: "pre-line" }}>
                    {selectedConcept.explanation}
                  </p>
                </div>
              )}

              {selectedConcept.examples && selectedConcept.examples.length > 0 && (
                <div>
                  <div className="drawer-section-title">Real-World Examples</div>
                  <ul style={{ paddingLeft: "1.2rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                    {selectedConcept.examples.map((ex, i) => (
                      <li key={i} style={{ marginBottom: "0.35rem" }}>{ex}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedConcept.prerequisites && selectedConcept.prerequisites.length > 0 && (
                <div>
                  <div className="drawer-section-title">Prerequisites</div>
                  <div className="prereq-chips">
                    {selectedConcept.prerequisites.map((p, idx) => (
                      <span key={idx} className="prereq-chip">
                        🔗 {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="drawer-placeholder">
            <span style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>👈</span>
            <p>Click any node on the graph to inspect its concept breakdown and prerequisites.</p>
          </div>
        )}
      </div>
    </div>
  );
}
