import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Construction,
  Lock,
  Search,
  User,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DataService } from '../services/dataService';
import { MvuBridge, waitForMvuReady } from '../services/mvuBridge';

// Wrapper for standard pages
const PageLayout = ({ title, children, onBack, color = 'bg-gray-100' }: any) => (
  <div className={`h-full flex flex-col ${color} overflow-hidden animate-fade-in`}>
    <div className="px-4 py-4 flex items-center gap-3 bg-white/50 backdrop-blur-md shadow-sm z-10">
      <button onClick={onBack} className="p-1 rounded-full hover:bg-black/5">
        <ArrowLeft className="text-gray-800" />
      </button>
      <h1 className="text-lg font-bold text-gray-800">{title}</h1>
    </div>
    <div className="flex-1 overflow-auto p-4">{children}</div>
  </div>
);

export const BodyStatsApp = ({ onBack }: { onBack: () => void }) => <BodyScanApp onBack={onBack} />;

type RoleMap = Record<string, any>;

function extractScalar(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(extractScalar).join(', ');
  if (typeof value === 'object') {
    const record = value as Record<string, any>;
    const scalarCandidates = [record.value, record.current, record.amount, record.描述, record.description];
    for (const candidate of scalarCandidates) {
      if (typeof candidate === 'number' || typeof candidate === 'string' || typeof candidate === 'boolean')
        return String(candidate);
    }
    try {
      return JSON.stringify(record);
    } catch {
      return '[object]';
    }
  }
  return String(value);
}

function isScalarValue(value: unknown): value is string | number | boolean | null | undefined {
  return value === null || value === undefined || ['string', 'number', 'boolean'].includes(typeof value);
}

function clampPercent(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

const STAT_ORDER: string[] = [
  '警戒度',
  '堕落值',
  '好感度',
  '性欲',
  '快感值',
  '阴蒂敏感度',
  '小穴敏感度',
  '菊穴敏感度',
  '尿道敏感度',
  '乳头敏感度',
  '阴蒂高潮次数',
  '小穴高潮次数',
  '菊穴高潮次数',
  '尿道高潮次数',
  '乳头高潮次数',
];

const BAR_STATS = new Set(['警戒度', '堕落值', '好感度', '性欲', '快感值']);

const CLOTHING_KEYS = ['头饰', '上衣', '内衣', '下着', '鞋袜'] as const;

type DetailPanel = null | '服装' | '内心想法' | '催眠经历';

const BodyScanApp: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [vipUnlocked, setVipUnlocked] = useState(false);
  const [roles, setRoles] = useState<RoleMap>({});
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [detailPanel, setDetailPanel] = useState<DetailPanel>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hypnosisExperiences, setHypnosisExperiences] = useState<string[]>([]);

  const refreshRef = useRef<() => void>(() => { });
  const selectorRef = useRef<HTMLDivElement | null>(null);

  const roleNames = useMemo(
    () =>
      Object.keys(roles)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [roles],
  );
  const filteredRoleNames = useMemo(() => {
    const q = search.trim();
    if (!q) return roleNames;
    return roleNames.filter(name => name.includes(q));
  }, [roleNames, search]);

  const roleData = useMemo(() => {
    if (!selectedRole) return null;
    return roles[selectedRole] ?? null;
  }, [roles, selectedRole]);

  useEffect(() => {
    if (detailPanel === '催眠经历') {
      DataService.getHypnosisExperiences().then(setHypnosisExperiences).catch(() => setHypnosisExperiences([]));
    }
  }, [detailPanel]);

  const orderedStatEntries = useMemo(() => {
    if (!roleData || typeof roleData !== 'object') return [];
    const record = roleData as Record<string, any>;
    const seen = new Set<string>();
    const entries: Array<[string, any]> = [];

    for (const k of STAT_ORDER) {
      if (Object.prototype.hasOwnProperty.call(record, k)) {
        entries.push([k, record[k]]);
        seen.add(k);
      }
    }
    for (const [k, v] of Object.entries(record)) {
      if (seen.has(k)) continue;
      if (k.startsWith('_')) continue;
      entries.push([k, v]);
    }
    return entries;
  }, [roleData]);

  const nonBarEntries = useMemo(() => orderedStatEntries.filter(([k]) => !BAR_STATS.has(k)), [orderedStatEntries]);

  const sensitivityEntries = useMemo(
    () => nonBarEntries.filter(([k, v]) => k.includes('敏感度') && isScalarValue(v)),
    [nonBarEntries],
  );

  const orgasmCountEntries = useMemo(
    () => nonBarEntries.filter(([k, v]) => k.includes('高潮次数') && isScalarValue(v)),
    [nonBarEntries],
  );

  const otherScalarEntries = useMemo(
    () =>
      nonBarEntries.filter(
        ([k, v]) =>
          isScalarValue(v) && !k.includes('敏感度') && !k.includes('高潮次数') && k !== '内心想法',
      ),
    [nonBarEntries],
  );

  const complexEntries = useMemo(
    () => nonBarEntries.filter(([k, v]) => !isScalarValue(v) && k !== '服装'),
    [nonBarEntries],
  );

  const clothingData = useMemo(() => {
    if (!roleData || typeof roleData !== 'object') return null;
    const raw = (roleData as Record<string, unknown>)['服装'];
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, string>) : null;
  }, [roleData]);

  const innerThoughts = useMemo(() => {
    if (!roleData || typeof roleData !== 'object') return null;
    const raw = (roleData as Record<string, unknown>)['内心想法'];
    return typeof raw === 'string' ? raw : raw != null ? String(raw) : null;
  }, [roleData]);

  const refresh = async () => {
    setError(null);
    setLoading(true);

    try {
      const rolesData = await MvuBridge.getRoles();
      if (!rolesData) {
        setRoles({});
        setSelectedRole(null);
        setError('未连接到酒馆变量（MVU 未初始化或不在酒馆环境中）');
        return;
      }

      setRoles(rolesData);
      const nextNames = Object.keys(rolesData)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'zh-CN'));
      setSelectedRole(prev => {
        if (prev && nextNames.includes(prev)) return prev;
        return nextNames[0] ?? null;
      });
    } catch (err) {
      console.warn('[HypnoOS] 身体检测读取失败', err);
      setError('读取失败：请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  refreshRef.current = refresh;

  useEffect(() => {
    let stopped = false;
    void (async () => {
      try {
        const unlocks = await DataService.getUnlocks();
        if (stopped) return;
        setVipUnlocked(unlocks.bodyStatsUnlocked);
      } catch (err) {
        console.warn('[HypnoOS] 读取功能解锁状态失败', err);
      }
    })();
    return () => {
      stopped = true;
    };
  }, []);

  useEffect(() => {
    if (!selectorOpen) return;
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (selectorRef.current && !selectorRef.current.contains(target)) {
        setSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [selectorOpen]);

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    let stops: Array<{ stop: () => void }> = [];
    void (async () => {
      try {
        const ready = await waitForMvuReady({ timeoutMs: 5000, pollMs: 150 });
        if (!ready) return;
        stops = [
          eventOn(Mvu.events.VARIABLE_INITIALIZED, () => refreshRef.current()),
          eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, () => refreshRef.current()),
        ];
      } catch {
        // ignore: not in tavern env
      }
    })();
    return () => {
      stops.forEach(s => s.stop());
    };
  }, []);

  return (
    <div className="h-full relative flex flex-col bg-gradient-to-b from-slate-950 via-slate-950 to-black text-white overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center justify-between border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft size={18} className="text-white/80" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-cyan-300" />
              <h1 className="text-sm font-bold tracking-wide">身体检测</h1>
              {!vipUnlocked && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/70 flex items-center gap-1">
                  <Lock size={10} /> 受限
                </span>
              )}
            </div>
          </div>
        </div>

        <div ref={selectorRef} className="relative shrink-0">
          <button
            onClick={() => {
              setSearch('');
              setSelectorOpen(v => !v);
            }}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/85 flex items-center gap-2 transition-colors"
          >
            <User size={14} className="text-white/60" />
            <span className="max-w-[120px] truncate">{selectedRole ?? '选择目标'}</span>
            <ChevronDown size={14} className="text-white/30" />
          </button>

          {selectorOpen && (
            <div className="absolute right-0 top-full mt-2 w-[260px] max-w-[80vw] z-50 rounded-2xl border border-white/10 bg-slate-950 shadow-[0_10px_40px_rgba(0,0,0,0.6)] overflow-hidden">
              <div className="p-3 border-b border-white/10 bg-black/20">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                  <Search size={14} className="text-white/40" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="搜索角色..."
                    className="w-full bg-transparent text-xs text-white/80 placeholder:text-white/30 focus:outline-none"
                  />
                </div>
              </div>

              <div className="max-h-[45vh] overflow-y-auto no-scrollbar p-2 space-y-1">
                {filteredRoleNames.length === 0 ? (
                  <div className="py-6 text-center text-xs text-white/40">未找到匹配角色</div>
                ) : (
                  filteredRoleNames.map(name => {
                    const active = name === selectedRole;
                    return (
                      <button
                        key={name}
                        onClick={() => {
                          setSelectedRole(name);
                          setSelectorOpen(false);
                        }}
                        className={[
                          'w-full text-left px-3 py-2 rounded-xl border transition-colors flex items-center justify-between gap-3',
                          active
                            ? 'bg-white/10 border-cyan-400/30'
                            : 'bg-white/0 border-white/5 hover:bg-white/5 hover:border-white/10',
                        ].join(' ')}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white/90 truncate">{name}</div>
                          <div className="text-[10px] text-white/40 truncate">
                            {roles[name] && typeof roles[name] === 'object'
                              ? `${Object.keys(roles[name]).filter(k => !k.startsWith('_')).length} 项`
                              : '—'}
                          </div>
                        </div>
                        <div
                          className={[
                            'w-9 h-9 rounded-2xl flex items-center justify-center',
                            active ? 'bg-cyan-500/20' : 'bg-white/5',
                          ].join(' ')}
                        >
                          <User size={18} className={active ? 'text-cyan-300' : 'text-white/40'} />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 border-b border-white/5 bg-black/30">
          <div className="flex items-start gap-2 text-[11px] text-amber-200/90">
            <AlertTriangle size={14} className="mt-0.5 text-amber-300" />
            <div className="leading-snug">{error}</div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
        {loading ? (
          <div className="space-y-3">
            <div className="h-14 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
            <div className="h-28 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
            <div className="h-28 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
          </div>
        ) : roleNames.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/50 text-sm">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
              <Activity className="text-cyan-300" />
            </div>
            暂无角色数据
          </div>
        ) : !selectedRole ? (
          <div className="h-full flex flex-col items-center justify-center text-white/50 text-sm">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
              <User className="text-white/60" />
            </div>
            请选择检测目标
          </div>
        ) : !roleData ? (
          <div className="h-full flex flex-col items-center justify-center text-white/50 text-sm">暂无该角色数据</div>
        ) : !vipUnlocked ? (
          <div className="p-5 rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-black/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Lock size={18} className="text-white/60" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold">检测模块未授权</div>
                <div className="text-xs text-white/60 mt-1 leading-relaxed">
                  该模块属于 VIP1「角色状态可视化」。解锁后可查看警戒度、堕落值、性欲、快感值等量化数据与明细项。
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
              <div className="text-xs text-white/50 mb-2">目标</div>
              <div className="text-base font-bold truncate">{selectedRole}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {orderedStatEntries
                .filter(([k]) => BAR_STATS.has(k))
                .map(([k, v]) => (
                  <StatRow key={k} label={k} value={v} />
                ))}
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setDetailPanel(prev => (prev === '服装' ? null : '服装'))}
                className={[
                  'flex-1 min-w-0 py-3 px-4 rounded-xl border text-sm font-semibold transition-colors',
                  detailPanel === '服装'
                    ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                    : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10',
                ].join(' ')}
              >
                服装
              </button>
              <button
                type="button"
                onClick={() => setDetailPanel(prev => (prev === '内心想法' ? null : '内心想法'))}
                className={[
                  'flex-1 min-w-0 py-3 px-4 rounded-xl border text-sm font-semibold transition-colors',
                  detailPanel === '内心想法'
                    ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                    : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10',
                ].join(' ')}
              >
                内心想法
              </button>
              <button
                type="button"
                onClick={() => setDetailPanel(prev => (prev === '催眠经历' ? null : '催眠经历'))}
                className={[
                  'flex-1 min-w-0 py-3 px-4 rounded-xl border text-sm font-semibold transition-colors',
                  detailPanel === '催眠经历'
                    ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                    : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10',
                ].join(' ')}
              >
                催眠经历
              </button>
            </div>

            {detailPanel === '服装' && (
              <div className="p-4 rounded-2xl border border-white/10 bg-white/5 space-y-2">
                <div className="text-xs font-bold text-white/80 mb-3">服装明细</div>
                {CLOTHING_KEYS.map(label => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-3 py-2 border-b border-white/5 last:border-0"
                  >
                    <span className="text-[11px] text-white/60 shrink-0 w-16">{label}</span>
                    <span className="text-[11px] text-white/90 text-right break-words flex-1">
                      {clothingData && clothingData[label] ? String(clothingData[label]).trim() : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {detailPanel === '内心想法' && (
              <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                <div className="text-xs font-bold text-white/80 mb-3">内心想法</div>
                <div className="text-[11px] text-white/85 leading-relaxed whitespace-pre-wrap break-words">
                  {innerThoughts && innerThoughts.trim() ? innerThoughts.trim() : '—'}
                </div>
              </div>
            )}

            {detailPanel === '催眠经历' && (
              <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                <div className="text-xs font-bold text-white/80 mb-3">催眠经历</div>
                {hypnosisExperiences.length === 0 ? (
                  <div className="text-[11px] text-white/50">暂无记录</div>
                ) : (
                  <ul className="space-y-2">
                    {hypnosisExperiences.map((line, i) => (
                      <li key={i} className="text-[11px] text-white/85 leading-relaxed border-b border-white/5 pb-2 last:border-0 last:pb-0">
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {sensitivityEntries.length > 0 && <StatGroupCard title="敏感度" entries={sensitivityEntries} />}

            {orgasmCountEntries.length > 0 && <StatGroupCard title="高潮次数" entries={orgasmCountEntries} />}

            {otherScalarEntries.length > 0 && <StatGroupCard title="其他数值" entries={otherScalarEntries} />}

            {complexEntries.length > 0 && (
              <div className="space-y-2">
                {complexEntries.map(([k, v]) => (
                  <KeyValueRow key={k} k={k} v={v} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const StatGroupCard: React.FC<{ title: string; entries: Array<[string, any]> }> = ({ title, entries }) => (
  <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
    <div className="flex items-center justify-between mb-3">
      <div className="text-xs font-bold text-white/80">{title}</div>
      <div className="text-[10px] text-white/40">{entries.length}</div>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {entries.map(([k, v]) => (
        <MiniStat key={k} label={k} value={v} />
      ))}
    </div>
  </div>
);

const MiniStat: React.FC<{ label: string; value: unknown }> = ({ label, value }) => (
  <div className="px-3 py-2 rounded-xl border border-white/10 bg-black/20">
    <div className="text-[10px] text-white/55 truncate">{label}</div>
    <div className="mt-0.5 text-sm font-bold text-white/90 tabular-nums truncate">{extractScalar(value)}</div>
  </div>
);

const StatRow: React.FC<{ label: string; value: unknown }> = ({ label, value }) => {
  const numeric = typeof value === 'number' ? value : Number(value);
  const percent = clampPercent(Number.isFinite(numeric) ? numeric : 0) ?? 0;
  const color =
    label === '警戒度'
      ? 'from-red-500 to-amber-400'
      : label === '堕落值'
        ? 'from-emerald-400 to-cyan-400'
        : label === '好感度'
          ? 'from-pink-400 to-rose-400'
          : label === '性欲'
            ? 'from-fuchsia-400 to-cyan-400'
            : 'from-cyan-400 to-violet-400';

  return (
    <div className="p-3 rounded-xl border border-white/10 bg-black/20">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-white/80">{label}</div>
        <div className="text-xs font-bold text-white/90 tabular-nums">
          {Number.isFinite(numeric) ? numeric : extractScalar(value)}
        </div>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

const KeyValueRow: React.FC<{ k: string; v: unknown }> = ({ k, v }) => {
  const [open, setOpen] = useState(false);
  const isExpandable = v !== null && typeof v === 'object';

  if (!isExpandable) {
    return (
      <div className="flex items-start justify-between gap-3 p-3 rounded-xl border border-white/10 bg-black/20">
        <div className="text-[11px] text-white/70 font-semibold min-w-[80px]">{k}</div>
        <div className="text-[11px] text-white/85 text-right break-words">{extractScalar(v)}</div>
      </div>
    );
  }

  let preview = '[object]';
  if (Array.isArray(v)) preview = `Array(${v.length})`;
  else preview = `Object(${Object.keys(v as any).length})`;

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 p-3 hover:bg-white/5 transition-colors"
      >
        <div className="text-[11px] text-white/70 font-semibold">{k}</div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-white/40">{preview}</div>
          {open ? (
            <ChevronUp size={14} className="text-white/30" />
          ) : (
            <ChevronDown size={14} className="text-white/30" />
          )}
        </div>
      </button>
      {open && (
        <pre className="text-[10px] leading-relaxed text-white/80 p-3 border-t border-white/10 bg-black/30 overflow-x-auto">
          {safeJson(v)}
        </pre>
      )}
    </div>
  );
};

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export const HelpApp = ({ onBack }: { onBack: () => void }) => <HelpAppInner onBack={onBack} />;

type HelpTopic = {
  id: string;
  title: string;
  content: React.ReactNode;
};

const HelpCard = ({ title, onClick }: { title: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full bg-white p-4 rounded-xl shadow-sm flex justify-between items-center cursor-pointer active:scale-[0.99] transition-transform"
  >
    <span className="text-sm font-medium text-gray-700">{title}</span>
    <span className="text-gray-300">→</span>
  </button>
);

const HelpSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm">
    <div className="text-sm font-bold text-gray-800">{title}</div>
    <div className="mt-2 text-sm text-gray-600 leading-6">{children}</div>
  </div>
);

const HelpAppInner: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const helpTopics: HelpTopic[] = useMemo(
    () => [
      {
        id: 'core-stats',
        title: '核心数值说明（MC/警戒/服从/可疑）',
        content: (
          <div className="space-y-3">
            <HelpSection title="MC 能量">
              使用催眠 APP 会消耗能量，不同功能消耗不同。每天自然恢复至上限的 50%。
            </HelpSection>
            <HelpSection title="PT 点">用来解锁功能、提高 MC 能量上限、购买商城物品、订阅会员等。主要来源为完成任务。</HelpSection>
            <HelpSection title="警戒度">
              <div className="space-y-2">
                <div>
                  角色对主角的怀疑程度。到 100 时，角色会知道主角有催眠 APP，会极力回避主角，并全力让主角被惩罚或定罪。
                </div>
                <div>
                  增加来源：
                  <ul className="mt-1 list-disc pl-5 space-y-1">
                    <li>催眠结束时，对方眼前是主角且身体感觉不对劲</li>
                    <li>催眠过程被其他人看见</li>
                    <li>让对方进入催眠的时机太不自然</li>
                  </ul>
                </div>
                <div>每增加 5 点警戒度，会让「主角可疑度」每天自然增加 1 点。</div>
              </div>
            </HelpSection>
            <HelpSection title="堕落值">
              在催眠 APP 生效期间被进行的性爱与背德行为在「本轮 APP 操作」结束时结算，按本次行为整体增加 0～3 点。
              长时间不使用 APP 时，堕落值会通过脚本每天自然降低 1 点（不低于 0），当堕落值达到 80 及以上时不再自然下降。
            </HelpSection>
            <HelpSection title="主角可疑度">
              在社会看来主角有多可疑。肆无忌惮使用催眠 APP 会增加（例如被多人目击，或直接用催眠获取不当利益）。每天自然减少
              10 点。
            </HelpSection>
            <HelpSection title="PT 来源">
              PT 点主要来自完成任务（成就与任务 App 中领取）；也可通过完成剧情中的高潮等获得。用于订阅、商城、购买能量等。
            </HelpSection>
          </div>
        ),
      },
      {
        id: 'mc-points',
        title: '如何获取 MC 点数？',
        content: <div className="text-sm text-gray-600">通过完成成就、任务，或让角色高潮获得 PT。</div>,
      },
    ],
    [],
  );

  const [active, setActive] = useState<HelpTopic | null>(null);

  if (active) {
    return (
      <PageLayout title={active.title} onBack={() => setActive(null)} color="bg-gray-50">
        {active.content}
      </PageLayout>
    );
  }

  return (
    <PageLayout title="帮助中心" onBack={onBack} color="bg-gray-50">
      <div className="space-y-3">
        {helpTopics.map(topic => (
          <HelpCard key={topic.id} title={topic.title} onClick={() => setActive(topic)} />
        ))}
      </div>
      <div className="mt-8 text-center text-xs text-gray-400">
        Version 1.0.0 <br />
        Internal Build
      </div>
    </PageLayout>
  );
};

export const WipApp = ({ onBack, name }: { onBack: () => void; name: string }) => (
  <PageLayout title={name} onBack={onBack}>
    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
      <Construction size={48} className="mb-4" />
      <p>正在施工中...</p>
      <p className="text-xs mt-2">Coming Soon</p>
    </div>
  </PageLayout>
);
