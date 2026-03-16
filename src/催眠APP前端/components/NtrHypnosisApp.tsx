import { ArrowLeft, Clock } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { HypnosisTransitionView } from './HypnosisApp';
import { buildNtrHypnosisSendMessage } from '../prompts/ntrHypnosisSend';
import { DataService } from '../services/dataService';
import { MvuBridge } from '../services/mvuBridge';
import { HypnosisFeature, UserResources, VIP_LEVELS } from '../types';

/** 牛头图标，用于 NTR催眠 APP */
export const BullHeadLogoSVG = ({
  className,
  size = 24,
  ...props
}: {
  className?: string;
  size?: number | string;
  [key: string]: any;
}) => (
  <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="currentColor" {...props}>
    {/* 牛角（左） */}
    <path d="M5 7 L3 4 L6 6 L8 8 L7 9 Z" />
    {/* 牛角（右） */}
    <path d="M19 7 L21 4 L18 6 L16 8 L17 9 Z" />
    {/* 头部轮廓 */}
    <ellipse cx="12" cy="13" rx="7" ry="6" />
    {/* 眼睛 */}
    <circle cx="9" cy="12" r="1.2" fill="#111" />
    <circle cx="15" cy="12" r="1.2" fill="#111" />
    {/* 鼻孔 */}
    <ellipse cx="10.5" cy="15.5" rx="0.8" ry="0.5" fill="#111" />
    <ellipse cx="13.5" cy="15.5" rx="0.8" ry="0.5" fill="#111" />
  </svg>
);

interface NtrHypnosisAppProps {
  userData: UserResources;
  onUpdateUser: (data: UserResources) => void;
  onExit: () => void;
}

function parseFirstNumber(text: string | undefined): number | null {
  if (!text) return null;
  const match = text.match(/(\d+)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
}

function getFeatureNumericConfig(
  feature: HypnosisFeature,
): { label: string; unit: string; min: number; max: number; step?: number; hint?: string } | null {
  switch (feature.id) {
    case 'vip1_temp_sensitivity':
      return { label: '敏感度增加', unit: '点', min: 1, max: 999, step: 1 };
    case 'vip1_estrus':
      return { label: '发情增加', unit: '', min: 1, max: 999, step: 1 };
    case 'vip1_memory_erase':
      return { label: '记忆消除时长', unit: '分钟', min: 1, max: 1440, step: 1 };
    case 'vip2_pleasure':
      return { label: '给予快感', unit: '', min: 1, max: 999, step: 1, hint: '一次性给予目标快感值' };
    default:
      return null;
  }
}

export const NtrHypnosisApp: React.FC<NtrHypnosisAppProps> = ({ userData, onUpdateUser, onExit }) => {
  const [features, setFeatures] = useState<HypnosisFeature[]>([]);
  const [duration, setDuration] = useState(10);
  const [durationInput, setDurationInput] = useState('10');
  const [globalNote, setGlobalNote] = useState('');
  const [userDoingNote, setUserDoingNote] = useState('');
  const [performer, setPerformer] = useState('');
  const [sending, setSending] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    let stopped = false;
    void DataService.getFeatures().then(next => {
      if (!stopped) setFeatures(next);
    });
    return () => {
      stopped = true;
    };
  }, []);

  const durationClamped = useMemo(() => {
    const n = Number.parseInt(durationInput, 10);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(999, Math.max(1, n));
  }, [durationInput]);

  useEffect(() => {
    setDuration(durationClamped);
  }, [durationClamped]);

  const enabledForSend = useMemo(() => features.filter(f => f.isEnabled && f.id !== 'vip1_stats'), [features]);

  const updateFeature = (id: string, patch: Partial<HypnosisFeature>) => {
    setFeatures(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));
  };

  const toggleFeature = (id: string) => {
    const f = features.find(x => x.id === id);
    if (!f || f.id === 'vip1_stats') return;
    setFeatures(prev => prev.map(x => (x.id === id ? { ...x, isEnabled: !x.isEnabled } : x)));
  };

  const formatFeatureCost = (_feature: HypnosisFeature) => '';

  const handleGenerate = async () => {
    if (enabledForSend.length === 0) return;
    setIsTransitioning(true);
    setSending(true);
    try {
      await MvuBridge.appendThisTurnAppOperationLog('NTR催眠事件');

      const message = buildNtrHypnosisSendMessage({
        features: enabledForSend,
        durationMinutes: duration,
        globalNote,
        userDoingNote: userDoingNote.trim(),
        performer: performer.trim(),
      });

      const createChatMessages = (globalThis as any).createChatMessages;
      const triggerSlash = (globalThis as any).triggerSlash;
      if (typeof createChatMessages === 'function' && typeof triggerSlash === 'function') {
        await createChatMessages([{ role: 'user', message }], { refresh: 'affected' });
        await triggerSlash('/trigger');
      }

      // 与催眠 APP 一致：播放约 3.2s 全屏动画后恢复
      setTimeout(() => {
        setIsTransitioning(false);
        setSending(false);
      }, 3200);
    } catch (err) {
      console.warn('[HypnoOS] NTR催眠发送失败', err);
      setIsTransitioning(false);
      setSending(false);
    }
  };

  const renderTierSection = (tierConfig: (typeof VIP_LEVELS)[0]) => {
    const tierFeatures = features.filter(f => f.tier === tierConfig.tier && f.id !== 'vip1_stats');
    if (tierFeatures.length === 0) return null;

    return (
      <div key={tierConfig.tier} className="mb-6">
        <h3 className="text-amber-300/90 font-bold text-sm tracking-wider uppercase mb-2 px-1">{tierConfig.label}</h3>
        <div className="space-y-3">
          {tierFeatures.map(feature => (
            <div
              key={feature.id}
              className={`
                bg-white/5 border rounded-xl overflow-hidden transition-all duration-300
                ${feature.isEnabled ? 'border-amber-500/50 bg-amber-500/10' : 'border-white/10'}
              `}
            >
              <div
                className="p-3 flex justify-between items-center cursor-pointer hover:bg-white/5"
                onClick={() => toggleFeature(feature.id)}
              >
                <div>
                  <div className="font-medium text-gray-100">{feature.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{formatFeatureCost(feature)}</div>
                </div>
                <div
                  className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${feature.isEnabled ? 'bg-amber-500' : 'bg-gray-700'}`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 shadow-sm ${feature.isEnabled ? 'left-5' : 'left-1'}`}
                  />
                </div>
              </div>

              {feature.isEnabled && (
                <div className="px-3 pb-3 pt-0 border-t border-white/5">
                  <p className="text-xs text-gray-300 mt-2 leading-relaxed opacity-90">{feature.description}</p>
                  {(() => {
                    const cfg = getFeatureNumericConfig(feature);
                    if (!cfg) return null;
                    const currentRaw = feature.userNumber;
                    const current = typeof currentRaw === 'number' && Number.isFinite(currentRaw) ? currentRaw : '';
                    return (
                      <div className="mt-3">
                        <label>
                          <div className="text-[10px] text-gray-400 mb-1">
                            {cfg.label}
                            {cfg.unit ? `（${cfg.unit}）` : ''}
                          </div>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={cfg.min}
                            max={cfg.max}
                            step={cfg.step ?? 1}
                            value={current}
                            onChange={e => {
                              const raw = e.target.value;
                              if (!raw) {
                                updateFeature(feature.id, { userNumber: undefined });
                                return;
                              }
                              const next = Number(raw);
                              if (!Number.isFinite(next)) return;
                              updateFeature(feature.id, {
                                userNumber: Math.max(cfg.min, Math.min(cfg.max, Math.floor(next))),
                              });
                            }}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                            placeholder={`${cfg.min}-${cfg.max}`}
                          />
                        </label>
                      </div>
                    );
                  })()}
                  {feature.id !== 'vip1_stats' && (
                    <textarea
                      placeholder={feature.notePlaceholder || '在此输入具体指令备注...'}
                      value={feature.userNote || ''}
                      onChange={e => updateFeature(feature.id, { userNote: e.target.value })}
                      className="w-full mt-3 bg-black/30 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 resize-none h-16"
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isTransitioning) {
    const target = typeof document !== 'undefined' ? document.body : null;
    if (!target) return <HypnosisTransitionView />;
    return createPortal(<HypnosisTransitionView />, target);
  }

  return (
    <div className="h-full flex flex-col bg-[#0f0518] relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] bg-amber-900/15 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] bg-orange-900/15 rounded-full blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-30 flex items-center justify-between px-4 py-3 bg-gray-900/80 backdrop-blur-xl border-b border-white/10">
        <button
          onClick={onExit}
          className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors rounded-full active:bg-white/10"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-pink-300 font-bold text-sm tracking-wider">NTR催眠</span>
        </div>
        <div className="min-w-[44px]" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">{VIP_LEVELS.map(tier => renderTierSection(tier))}</div>

      {/* Footer */}
      <div className="bg-gray-900/95 backdrop-blur-xl border-t border-white/10 p-4 pb-8 rounded-t-2xl shrink-0 space-y-3">
        <div>
          <label className="text-[10px] text-gray-500 block mb-1">由谁来催眠（选填，不填则系统生成路人）</label>
          <input
            type="text"
            placeholder="例如：路过的催眠师、某位同学..."
            value={performer}
            onChange={e => setPerformer(e.target.value)}
            className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-1">备注（目标、场景等）</label>
          <input
            type="text"
            placeholder="可以输入要催眠谁、场景或其他备注"
            value={globalNote}
            onChange={e => setGlobalNote(e.target.value)}
            className="w-full bg-black/40 border-b border-white/20 px-2 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-1">主角这段时间在做的事（选填）</label>
          <input
            type="text"
            placeholder="例如：在图书馆自习、在宿舍睡觉..."
            value={userDoingNote}
            onChange={e => setUserDoingNote(e.target.value)}
            className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-gray-800 rounded-lg px-3 py-2 border border-white/5">
            <Clock size={16} className="text-amber-400 mr-2" />
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={durationInput}
              onChange={e => setDurationInput(e.target.value)}
              onBlur={() => setDurationInput(String(duration))}
              className="w-12 bg-transparent text-white font-bold text-center focus:outline-none"
            />
            <span className="text-xs text-gray-400 ml-1">分钟</span>
          </div>
          <button
            onClick={() => void handleGenerate()}
            disabled={enabledForSend.length === 0 || sending}
            className={`
              flex-1 py-3 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all
              ${
                enabledForSend.length > 0 && !sending
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:shadow-amber-500/25 active:scale-95'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {sending ? '发送中…' : enabledForSend.length === 0 ? '请至少选择一项功能' : '生成事件'}
          </button>
        </div>
      </div>
    </div>
  );
};
