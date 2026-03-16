import { AlertTriangle, ArrowLeft } from 'lucide-react';
import React, { useState } from 'react';
import { DataService } from '../services/dataService';
import type { UserResources } from '../types';

interface CustomQuestAppProps {
  userData: UserResources;
  onUpdateUser: (data: UserResources) => void;
  onBack: () => void;
}

export const CustomQuestApp: React.FC<CustomQuestAppProps> = ({ userData, onUpdateUser, onBack }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 2200);
  };

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    if (!trimmedTitle) {
      showNotice('请先填写任务名称');
      return;
    }
    if (!trimmedDesc) {
      showNotice('请先填写任务内容');
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      const result = await DataService.createCustomQuest({
        name: trimmedTitle,
        condition: trimmedDesc,
      });
      if (!result.success) {
        showNotice(result.message || '发布失败，请稍后再试');
        return;
      }

      void DataService.getUserData().then(next => onUpdateUser(next));

      showNotice('已发布挑战，可在「成就与挑战」中查看');
      setTitle('');
      setDescription('');
    } catch (err) {
      console.warn('[HypnoOS] 发布自定义任务失败', err);
      showNotice('发布失败，请稍后再试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white animate-fade-in relative overflow-hidden">
      <div className="px-4 py-4 pt-6 flex items-center justify-between z-10 bg-slate-900/90 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft className="text-gray-300" size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-wide">挑战发布</h1>
            <p className="text-xs text-gray-400">自定义挑战并发布到列表中，用于引导后续玩法。</p>
          </div>
        </div>
        <div className="text-xs text-gray-300"></div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
        <section className="space-y-2 bg-white/5 rounded-xl p-3 border border-white/10">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-gray-300">
              挑战名称 <span className="text-red-400">*</span>
            </span>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例如：在不催眠的情况下完成一次大胆挑战"
              className="bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span className="text-gray-300">
              挑战内容 / 完成条件 <span className="text-red-400">*</span>
            </span>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="描述任务的达成条件，建议写得具体一些，方便你和 LLM 判断是否完成。"
              rows={4}
              className="bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 resize-none"
            />
          </label>
        </section>

        <section className="space-y-2 bg-amber-500/10 rounded-xl p-3 border border-amber-500/30">
          <div className="flex items-start gap-2 text-xs text-amber-100">
            <AlertTriangle size={14} className="mt-0.5 text-amber-300" />
            <div className="space-y-1">
              <div className="font-bold">说明</div>
              <p>发布免费，挑战发布后会出现在相关列表中。在剧情中完成该挑战后，可以在成就与挑战界面进行标记。</p>
            </div>
          </div>
        </section>
      </div>

      <div className="px-4 pb-6 pt-3 bg-slate-900/90 border-t border-white/10 backdrop-blur-md">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !description.trim()}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold shadow-lg transition-all
            ${
              submitting || !title.trim() || !description.trim()
                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                : 'bg-linear-to-r from-amber-400 to-rose-500 text-black hover:shadow-amber-500/40 active:scale-95'
            }`}
        >
          发布任务
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
