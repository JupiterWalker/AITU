import { useState, useEffect } from 'react';
import { GraphService, type GraphBasic } from '../service';
// 无需显式导入 React（Vite + TSX 自动处理），保持文件纯静态组件。

// 静态首页，含居中标题、输入框占位、下方四个骨架卡片
// 使用 Tailwind（项目已集成）来快速布局与灰色占位样式。
// 后续可以将搜索/问题输入逻辑接入真正的业务；当前仅静态展示。
interface HomePageProps {
  onSubmitQuestion?: (q: string) => void;
  onSelectExistingGraph?: (graph: any) => void;
}

export default function HomePage({ onSubmitQuestion, onSelectExistingGraph }: HomePageProps) {
  const [value, setValue] = useState('');
  const [graphs, setGraphs] = useState<GraphBasic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const list = await GraphService.listGraphs();
      if (!cancelled) {
        setGraphs(list);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = async (e) => {
    if (e.key === 'Enter') {
      const q = value.trim();
      if (!q) return;

      // 创建新图
      const createdGraph = await GraphService.createGraph({
        title: q,
        nodes: [{
            id: 'root',
            type: 'markdown',
            data: {label: '💡 输入你的第一个问题'},
            position: {x: 250, y: 50},
            // draggable: false,
            selected: true,
            dragHandle: '.drag-handle__custom'
        }],
        edges: []
      });

      if (createdGraph) {
        onSubmitQuestion?.(q);
        onSelectExistingGraph?.(createdGraph);
      }
    }
  };

  return (
    <div className="w-screen h-screen bg-white flex items-center justify-center p-4">
      {/* 整体下移：增加顶部内边距 */}
      <div className="w-full max-w-5xl h-[90vh] rounded-xl flex flex-col items-center pt-72 relative">
        {/* 中间标题与输入框 */}
        <div className="flex flex-col items-center w-full px-4">
          <h1 className="text-2xl font-medium text-gray-700 mb-10 tracking-wide">
            今天我们探索什么？
          </h1>

          <input
            className="w-[36rem] h-20 border border-gray-300 rounded-md px-6 text-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="输入你的问题并回车..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* 骨架区域 / 图列表 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mt-24 w-full px-12">
          {(loading ? Array.from({ length: 4 }) : graphs).map((item: any, i) => {
            const title = loading ? '加载中…' : item.title;
            return (
              <div
                key={loading ? i : item.id}
                className="flex flex-col items-center w-full cursor-pointer group"
                onClick={async () => {
                  if (loading) return;
                  const detail = await GraphService.getGraph(item.id);
                  if (detail) onSelectExistingGraph?.(detail);
                }}
              >
                {/* 上方主骨架占位或缩略图位 */}
                <div className="w-full flex flex-col gap-2 mb-4">
                  <div className={`h-3 rounded ${loading ? 'bg-gray-100 animate-pulse' : 'bg-indigo-50'}`} />
                  <div className="flex gap-2">
                    <div className={`flex-1 h-12 rounded ${loading ? 'bg-gray-100 animate-pulse' : 'bg-indigo-100 group-hover:bg-indigo-200'}`} />
                    <div className="flex-1 flex flex-col gap-2">
                      <div className={`h-6 rounded ${loading ? 'bg-gray-100 animate-pulse' : 'bg-indigo-100 group-hover:bg-indigo-200'}`} />
                      <div className={`h-6 rounded ${loading ? 'bg-gray-100 animate-pulse' : 'bg-indigo-100 group-hover:bg-indigo-200'}`} />
                    </div>
                  </div>
                </div>
                {/* 图标题 */}
                <div className="text-sm text-gray-700 font-medium text-center line-clamp-2 min-h-[2.5rem]">
                  {title}
                </div>
                {/* 下方分隔与次区域，可用于未来显示统计 */}
              </div>
            );
          })}
          {!loading && graphs.length === 0 && (
            <div className="col-span-full text-center text-gray-400">暂无探索图，创建第一个问题开始吧。</div>
          )}
        </div>
      </div>
    </div>
  );
}
