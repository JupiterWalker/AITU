import React, { useEffect, useRef, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import KnowledgeGraph from './KnowledgeGraph';
import { GraphService } from '../service';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

// 页面负责：根据路由参数加载图，或创建新图（携带问题），并渲染菜单
export default function GraphPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const initialQuestion = searchParams.get('q') || undefined;
  const navigate = useNavigate();

  const [prefillGraph, setPrefillGraph] = useState<any | null>(null);
  const graphApiRef = useRef<{ exportGraph: () => any; importGraph: (p:any)=>void } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (id) {
        const detail = await GraphService.getGraph(Number(id));
        if (!cancelled) setPrefillGraph(detail);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  function triggerImportChooser() { fileInputRef.current?.click(); }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const json = JSON.parse(String(ev.target?.result || ''));
        graphApiRef.current?.importGraph(json);
      } catch(err) { console.error('导入失败', err); }
    };
    reader.readAsText(file);
  }

  function downloadJSON(data: any, filename: string) {
    try {
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    } catch (e) { console.error('下载失败', e); }
  }

  return (
    <div style={{width: '100vw', height: '100vh', position: 'relative'}}>
      <ReactFlowProvider>
        <KnowledgeGraph
          bootstrapQuestion={initialQuestion}
          prefillGraph={prefillGraph || undefined}
          onGraphImport={(p)=> { console.log('已导入图', p); }}
          onRegisterApi={(api) => { graphApiRef.current = api; }}
        />
      </ReactFlowProvider>
      <div style={{position:'absolute', top:12, left:12, zIndex:1000}}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            background:'#f5f6ff', border:'1px solid #e0e3f5', padding:'6px 8px', borderRadius:8,
            cursor:'pointer', boxShadow:'0 2px 4px rgba(0,0,0,0.08)', fontSize:18, lineHeight:1
          }}
          aria-haspopup="true"
          aria-expanded={menuOpen}
        >☰</button>
        {menuOpen && (
          <div style={{
              marginTop:8, background:'#ffffff', border:'1px solid #e2e5ee', borderRadius:8,
              padding:'6px 0', minWidth:160, boxShadow:'0 4px 12px rgba(0,0,0,0.12)'
          }}>
            <div style={{padding:'6px 14px', cursor:'pointer', fontSize:14}} role="menuitem" onClick={() => { triggerImportChooser(); setMenuOpen(false); }}>Import</div>
            <div style={{padding:'6px 14px', cursor:'pointer', fontSize:14}} role="menuitem" onClick={() => {
              const payload = graphApiRef.current?.exportGraph();
              if (!payload) { console.warn('导出失败：API 未注册'); return; }
              downloadJSON(payload, `graph-export-${Date.now()}.json`);
              setMenuOpen(false);
            }}>Export…</div>
            <div style={{padding:'6px 14px', cursor:'pointer', fontSize:14}} role="menuitem" onClick={() => { navigate('/'); }}>返回首页</div>
          </div>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="application/json" style={{display:'none'}} onChange={handleFileSelected} />
    </div>
  );
}
