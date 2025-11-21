import { useState } from 'react';
import { UserService } from '../service';

interface LoginModalProps {
  onClose: () => void;
  onLoggedIn: (userId: number, name: string) => void;
}

// 两步弹窗：1) 输入 token 验证 2) 设置用户名密码（若需要）
export default function LoginModal({ onClose, onLoggedIn }: LoginModalProps) {
  const [mode, setMode] = useState<'token' | 'account'>('token');
  const [step, setStep] = useState<'token' | 'credentials'>('token');
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerifyToken = async () => {
    setLoading(true); setError(null);
    const id = await UserService.getUserIdByToken(token.trim());
    setLoading(false);
    if (!id) { setError('Token 无效或未找到用户'); return; }
    setUserId(id);
    // 进入第二步
    setStep('credentials');
  };

  const handleUpdate = async () => {
    if (!userId) return;
    if (password !== passwordConfirm) {
      setError('两次输入的密码不一致');
      return;
    }
    setLoading(true); setError(null);
    const updated = await UserService.updateCredentials(userId, userName.trim(), password);
    setLoading(false);
    if (!updated) { setError('更新失败'); return; }
    onLoggedIn(userId, userName.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
      <div className="bg-white w-[28rem] rounded-lg shadow-lg p-6 relative">
        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600" onClick={onClose}>✕</button>
        {/* 模式切换 */}
        <div className="flex mb-4 gap-2 text-sm">
          <button
            className={`px-3 py-1 rounded ${mode==='token' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => { setMode('token'); setStep('token'); setError(null); }}
          >Token 登录</button>
          <button
            className={`px-3 py-1 rounded ${mode==='account' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => { setMode('account'); setError(null); }}
          >账户登录</button>
        </div>
        {mode === 'token' && step === 'token' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">输入访问 Token</h2>
            <input
              className="border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
              placeholder="粘贴你的 token..."
              value={token}
              onChange={e => setToken(e.target.value)}
            />
            {error && <div className="text-sm text-red-600">{error}</div>}
            <button
              onClick={handleVerifyToken}
              disabled={!token || loading}
              className="bg-indigo-600 disabled:bg-indigo-300 text-white rounded px-4 py-2 text-sm"
            >{loading ? '验证中...' : '验证 Token'}</button>
            <p className="text-xs text-gray-500 leading-relaxed">Token 用于定位已有用户。如无账号，可先联系管理员分配。</p>
          </div>
        )}
  {mode === 'token' && step === 'credentials' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">设置用户名与密码</h2>
            <input
              className="border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
              placeholder="用户名"
              value={userName}
              onChange={e => setUserName(e.target.value)}
            />
            <input
              type="password"
              className="border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
              placeholder="密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <input
              type="password"
              className="border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
              placeholder="确认密码"
              value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)}
            />
            {error && <div className="text-sm text-red-600">{error}</div>}
            <button
              onClick={handleUpdate}
              disabled={!userName || !password || !passwordConfirm || password !== passwordConfirm || loading}
              className="bg-indigo-600 disabled:bg-indigo-300 text-white rounded px-4 py-2 text-sm"
            >{loading ? '提交中...' : '完成设置并进入'}</button>
            {password && passwordConfirm && password !== passwordConfirm && (
              <div className="text-xs text-red-500">两次密码不一致</div>
            )}
            <p className="text-xs text-gray-500">完成后 Token 将被清空，需要重新授权时请再次获取。</p>
          </div>
        )}
        {mode === 'account' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">账户登录</h2>
            <input
              className="border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
              placeholder="用户名"
              value={userName}
              onChange={e => setUserName(e.target.value)}
            />
            <input
              type="password"
              className="border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
              placeholder="密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            {error && <div className="text-sm text-red-600">{error}</div>}
            <button
              onClick={async () => {
                setLoading(true); setError(null);
                const logged = await UserService.login(userName.trim(), password);
                setLoading(false);
                if (!logged) { setError('登录失败'); return; }
                onLoggedIn(logged.id, userName.trim());
                onClose();
              }}
              disabled={!userName || !password || loading}
              className="bg-indigo-600 disabled:bg-indigo-300 text-white rounded px-4 py-2 text-sm"
            >{loading ? '登录中...' : '登录'}</button>
            <p className="text-xs text-gray-500">使用已注册的用户名与密码直接登录。</p>
          </div>
        )}
      </div>
    </div>
  );
}
