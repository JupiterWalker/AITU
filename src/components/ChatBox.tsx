import React from 'react';

interface ChatBoxProps {
  contextPrompt?: string;
  inputValue: string;
  setInputValue: (val: string) => void;
  handleInputSubmit: () => void;
  setContextPrompt?: (val: string) => void;
  onClearContextHighlight?: (text: string) => void;
}

const ChatBox: React.FC<ChatBoxProps> = ({
  contextPrompt,
  inputValue,
  setInputValue,
  handleInputSubmit,
  setContextPrompt,
  onClearContextHighlight,
}) => (
  <div className="fixed bottom-0 left-0 w-full bg-white z-20 flex justify-center bg-gradient-to-t from-white/95 via-white/80 to-white/20 shadow-[0_-8px_32px_0_rgba(0,0,0,0.07)] px-2 pb-4 pt-2">
    <div className="w-full max-w-3xl">
      {contextPrompt && (
        <div className="mb-3 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm flex items-start relative">
          <span className="mr-2 text-xl">📚</span>
          <div className="flex-1 text-gray-700 text-[15px]">
            <span className="font-semibold mr-1">关于:</span>
            {contextPrompt}
          </div>
          {setContextPrompt && (
            <button
              className="absolute top-2 right-3 text-gray-400 hover:text-gray-700 text-xl transition-colors"
              onClick={() => {
                if (onClearContextHighlight && contextPrompt) {
                  onClearContextHighlight(contextPrompt);
                }
                setContextPrompt('');
              }}
              aria-label="关闭"
            >
              ×
            </button>
          )}
        </div>
      )}
      <form
        className="flex flex-col gap-2"
        onSubmit={e => {
          e.preventDefault();
          handleInputSubmit();
        }}
      >
        <label className="mb-1 text-[15px] text-gray-600 flex items-center gap-1">
          <span className="text-lg">💬</span> 请输入新的子节点内容
        </label>
        <div className="flex gap-2">
          <textarea
              rows={3}
              className="flex-1 border border-gray-200 bg-white rounded-2xl px-4 py-3 text-base shadow focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition resize-none min-h-[48px]"
              placeholder="请输入新的子节点内容..."
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleInputSubmit();
                }
              }}
          />
          <button
              type="submit"
              disabled={!inputValue.trim()}
              className="ml-1 h-[48px] px-6 bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500 active:scale-95 text-white rounded-2xl shadow transition-all font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            添加
          </button>
        </div>
      </form>
    </div>
  </div>
);

export default ChatBox;
