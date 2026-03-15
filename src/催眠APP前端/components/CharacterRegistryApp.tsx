import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import React, { useState } from 'react';
import { MvuBridge } from '../services/mvuBridge';

interface CharacterRegistryAppProps {
  onBack: () => void;
}

export const CharacterRegistryApp: React.FC<CharacterRegistryAppProps> = ({ onBack }) => {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 2200);
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showNotice('请先填写姓名');
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      // 仅在 APP 内创建该角色的数值档案，不写入外部
      await MvuBridge.createRoleIfMissing(trimmedName, {
        好感度: 0,
        警戒度: 0,
        堕落值: 0,
        性欲: 0,
        快感值: 0,
        阴蒂敏感度: 100,
        小穴敏感度: 100,
        菊穴敏感度: 150,
        尿道敏感度: 100,
        乳头敏感度: 100,
        临时催眠效果: {},
        永久催眠效果: {},
        阴蒂高潮次数: 0,
        小穴高潮次数: 0,
        菊穴高潮次数: 0,
        尿道高潮次数: 0,
        乳头高潮次数: 0,
      });

      showNotice('已录入，可在 APP 中选择该角色使用');
      // 保留姓名方便连续录入；如需清空可在此处调用 setName('')
    } catch (err) {
      console.warn('[HypnoOS] 角色录入失败', err);
      showNotice('角色录入失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white animate-fade-in relative overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 pt-6 flex items-center justify-between z-10 bg-slate-900/90 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft className="text-gray-300" size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-wide">角色录入</h1>
            <p className="text-xs text-gray-400">
              输入角色名即可。APP 会为该角色建立数值档案，之后可在催眠等功能中选择使用。
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-400">基础信息</h2>
          <div className="space-y-3 bg-white/5 rounded-xl p-3 border border-white/10">
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-gray-300">
                姓名 <span className="text-red-400">*</span>
              </span>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例如：西园寺爱丽莎 / 某同人角色名"
                className="bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
              />
            </label>

            <p className="text-[11px] text-gray-400 leading-5">
              录入后，该角色会出现在 APP 的角色列表中，可对其使用催眠、查看身体数据等功能。
            </p>
          </div>
        </section>
      </div>

      {/* Footer: Confirm Button */}
      <div className="px-4 pb-6 pt-3 bg-slate-900/90 border-t border-white/10 backdrop-blur-md">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !name.trim()}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold shadow-lg transition-all
            ${
              submitting || !name.trim()
                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-black hover:shadow-emerald-500/40 active:scale-95'
            }`}
        >
          <CheckCircle2 size={18} />
          确认录入
        </button>
      </div>

      {notice && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-20 px-3 py-1.5 rounded-full bg-black/70 text-white text-xs border border-white/10 shadow-lg backdrop-blur-sm">
          {notice}
        </div>
      )}
    </div>
  );
};
