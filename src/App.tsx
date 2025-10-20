
import KnowledgeGraph from "./components/KnowledgeGraph.tsx";
import {ReactFlowProvider} from "@xyflow/react";
import './App.css'
import React, { useState } from "react"; // 或 './App.css'


function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div style={{width: '100vw', height: '100vh', position: 'relative'}}>
      <ReactFlowProvider>
        <KnowledgeGraph />
      </ReactFlowProvider>
      <div style={{position:'absolute', top:12, left:12, zIndex:1000}}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            background:'#f5f6ff',
            border:'1px solid #e0e3f5',
            padding:'6px 8px',
            borderRadius:8,
            cursor:'pointer',
            boxShadow:'0 2px 4px rgba(0,0,0,0.08)',
            fontSize:18,
            lineHeight:1
          }}
          aria-haspopup="true"
          aria-expanded={menuOpen}
        >
          ☰
        </button>
        {menuOpen && (
          <div style={{
            marginTop:8,
            background:'#ffffff',
            border:'1px solid #e2e5ee',
            borderRadius:8,
            padding:'6px 0',
            minWidth:140,
            boxShadow:'0 4px 12px rgba(0,0,0,0.12)'
          }}>
            <div style={{padding:'6px 14px', cursor:'pointer', fontSize:14}} role="menuitem">Open</div>
            <div style={{padding:'6px 14px', cursor:'pointer', fontSize:14}} role="menuitem">Save to…</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App
