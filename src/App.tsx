
import KnowledgeGraph from "./components/KnowledgeGraph.tsx";
import {ReactFlowProvider} from "@xyflow/react";
import './App.css'
import React, { useState, useRef } from "react"; // 或 './App.css'
import HomePage from './components/HomePage';


function App() {
  const [showHome, setShowHome] = useState(true);
  const [bootstrapQuestion, setBootstrapQuestion] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // const [lastExport, setLastExport] = useState<any | null>(null); // 首页暂不需要导出状态
  const graphApiRef = useRef<{ exportGraph: () => any; importGraph: (p:any)=>void } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const downloadJSON = (data: any, filename: string) => {
    console.log("触发 downloadJSON： ", data)
    try {
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      // Safari 需要元素在 DOM 中
      document.body.appendChild(a);
      a.click();
      // 延迟 revoke 避免某些浏览器取消下载
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 1000);
    } catch (e) {
      console.error('下载失败', e);
    }
  };

  function triggerImportChooser() {
    fileInputRef.current?.click();
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const json = JSON.parse(String(ev.target?.result || ''));
        graphApiRef.current?.importGraph(json);
      } catch(err) {
        console.error('导入失败', err);
      }
    };
    reader.readAsText(file);
  }

  if (showHome) {
    return <HomePage onSubmitQuestion={(q) => { setBootstrapQuestion(q); setShowHome(false); }} />;
  }
  // 原知识图页面保留，以后可以通过状态或路由返回。
  return (
    <div style={{width: '100vw', height: '100vh', position: 'relative'}}>
      <ReactFlowProvider>
        <KnowledgeGraph
          bootstrapQuestion={bootstrapQuestion || undefined}
          onGraphImport={(p)=> { console.log('已导入图', p); }}
          onRegisterApi={(api) => { graphApiRef.current = api; }}
        />
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
            <div
              style={{padding:'6px 14px', cursor:'pointer', fontSize:14}}
              role="menuitem"
              onClick={() => { triggerImportChooser(); setMenuOpen(false); }}
            >Save</div>
            <div
              style={{padding:'6px 14px', cursor:'pointer', fontSize:14}}
              role="menuitem"
              onClick={() => { triggerImportChooser(); setMenuOpen(false); }}
            >Import</div>
            <div
              style={{padding:'6px 14px', cursor:'pointer', fontSize:14}}
              role="menuitem"
              onClick={() => {
                console.log("点击 save to")
                const payload = graphApiRef.current?.exportGraph();
                if (!payload) { console.warn('导出失败：API 未注册'); return; }
                // setLastExport(payload);
                downloadJSON(payload, `graph-export-${Date.now()}.json`);
                setMenuOpen(false);
              }}
            >Export…</div>
          </div>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="application/json" style={{display:'none'}} onChange={handleFileSelected} />
    </div>
  );
}

export default App
