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
  const [reward, setReward] = useState<number>(10);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const cost = Number.isFinite(reward) && reward > 0 ? reward * 800 : 0;
  const insufficientMoney = userData.money < cost;

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
    if (!Number.isFinite(reward) || reward <= 0) {
      showNotice('奖励 PT 必须为正整数');
      return;
    }
    if (reward > 200) {
      showNotice('单个任务奖励不能超过 200 PT');
      return;
    }
    if (insufficientMoney) {
      showNotice('金钱不足，无法发布该任务');
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      const result = await DataService.createCustomQuest({
        name: trimmedTitle,
        condition: trimmedDesc,
        rewardPtPoints: reward,
      });
      if (!result.success) {
        showNotice(result.message || '发布失败，请稍后再试');
        return;
      }

      if (typeof result.newMoney === 'number') {
        onUpdateUser({ ...userData, money: result.newMoney });
      } else {
        void DataService.getUserData().then(next => onUpdateUser(next));
      }

      showNotice('已发布任务，可在「成就和任务」中接取');
      setTitle('');
      setDescription('');
      setReward(10);
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
            <h1 className="text-lg font-bold tracking-wide">任务发布</h1>
            <p className="text-xs text-gray-400">自定义任务并发布到任务列表中</p>
          </div>
        </div>
        <div className="flex flex-col items-end text-xs text-gray-300">
          <div>
            当前金钱：<span className="font-bold text-emerald-300">¥{userData.money.toLocaleString()}</span>
          </div>
          <div>
            奖励 1 PT 需要 <span className="font-bold text-amber-300">¥800</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
        <section className="space-y-2 bg-white/5 rounded-xl p-3 border border-white/10">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-gray-300">
              任务名称 <span className="text-red-400">*</span>
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
              任务内容 / 完成条件 <span className="text-red-400">*</span>
            </span>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="描述任务的达成条件，建议写得具体一些，方便你和 LLM 判断是否完成。"
              rows={4}
              className="bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 resize-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span className="text-gray-300">
              奖励 PT 点数 <span className="text-red-400">*</span>
            </span>
            <input
              type="number"
              min={1}
              max={200}
              step={1}
              value={Number.isNaN(reward) ? '' : reward}
              onChange={e => setReward(Number(e.target.value))}
              className="bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
            />
            <div className="text-[11px] text-gray-400 mt-1">
              发布价格：{reward > 0 ? (
                <span className={insufficientMoney ? 'text-red-400 font-semibold' : 'text-amber-300 font-semibold'}>
                  -¥{cost.toLocaleString()}
                </span>
              ) : (
                <span className="text-gray-500">请输入奖励点数</span>
              )}
            </div>
          </label>
        </section>

        <section className="space-y-2 bg-amber-500/10 rounded-xl p-3 border border-amber-500/30">
          <div className="flex items-start gap-2 text-xs text-amber-100">
            <AlertTriangle size={14} className="mt-0.5 text-amber-300" />
            <div className="space-y-1">
              <div className="font-bold">说明</div>
              <p>
                自定义任务发布后，会出现在「成就和任务」App 的任务列表中。你需要在剧情中实际完成该任务，
                并由 LLM 按世界书中的规则把对应任务的“已完成”设置为 true，才能在任务界面领取奖励 PT。
              </p>
              <p>
                自定义任务只能消耗金钱来发布，不会直接获得 PT。只有当任务完成并领取奖励时，才会增加 PT 点数。
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="px-4 pb-6 pt-3 bg-slate-900/90 border-t border-white/10 backdrop-blur-md">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            submitting || !title.trim() || !description.trim() || !Number.isFinite(reward) || reward <= 0 || insufficientMoney
          }
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold shadow-lg transition-all
            ${submitting ||
              !title.trim() ||
              !description.trim() ||
              !Number.isFinite(reward) ||
              reward <= 0 ||
              insufficientMoney
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

