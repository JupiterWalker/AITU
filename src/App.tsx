
import KnowledgeGraph from "./components/KnowledgeGraph.tsx";
import {ReactFlowProvider} from "@xyflow/react";
import './App.css'
import React from "react"; // 或 './App.css'


function App() {

  return (
      <div style={{width: '100vw', height: '100vh', position: 'relative'}}>
            <ReactFlowProvider>
          <KnowledgeGraph />
            </ReactFlowProvider>
      </div>
  );
}

export default App
