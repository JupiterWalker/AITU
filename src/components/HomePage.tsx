import { useState } from 'react';
// 无需显式导入 React（Vite + TSX 自动处理），保持文件纯静态组件。

// 静态首页，含居中标题、输入框占位、下方四个骨架卡片
// 使用 Tailwind（项目已集成）来快速布局与灰色占位样式。
// 后续可以将搜索/问题输入逻辑接入真正的业务；当前仅静态展示。
interface HomePageProps {
  onSubmitQuestion?: (q: string) => void;
}

export default function HomePage({ onSubmitQuestion }: HomePageProps) {
  const [value, setValue] = useState('');

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      const q = value.trim();
      if (!q) return;
      onSubmitQuestion?.(q);
    }
  };

  return (
    <div className="w-screen h-screen bg-white flex items-center justify-center p-4">
      {/* 整体下移：增加顶部内边距 */}
      <div className="w-full max-w-5xl h-[90vh] rounded-xl flex flex-col items-center pt-72 relative">
        {/* 中间标题与输入框 */}
        <div className="flex flex-col items-center w-full px-4">
          <h1 className="text-2xl font-medium text-gray-700 mb-10 tracking-wide">今天我们探索什么？</h1>
          <input
            className="w-[36rem] h-20 border border-gray-300 rounded-md px-6 text-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="输入你的问题并回车..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* 骨架区域 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mt-24 w-full px-12">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center w-full">
              {/* 上方主骨架图块 */}
              <div className="w-full flex flex-col gap-2 mb-6">
                <div className="h-3 bg-gray-100 rounded animate-pulse" />
                <div className="flex gap-2">
                  <div className="flex-1 h-12 bg-gray-100 rounded animate-pulse" />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="h-6 bg-gray-100 rounded animate-pulse" />
                    <div className="h-6 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
                {/* 分隔线 */}
                <div className="w-full h-[3px] bg-gray-100 rounded" />
              </div>
              
              {/* 下方次骨架 */}
              <div className="w-full flex flex-col gap-3 mt-6">
                <div className="flex gap-2">
                  <div className="flex-1 h-14 bg-gray-100 rounded animate-pulse" />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="h-6 bg-gray-100 rounded animate-pulse" />
                    <div className="h-6 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
                <div className="w-full h-[3px] bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
