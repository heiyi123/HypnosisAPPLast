import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Construction,
  Lock,
  Search,
  User,
} from 'lucide-react';
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
type MapCategory = 'teach' | 'life' | 'sport' | 'outdoor';

type MapLocation = {
  id: string;
  name: string;
  label: string;
  category: MapCategory;
  x: number;
  y: number;
  locationHint: string;
  summary: string;
  highlights?: string[];
};

const CAMPUS_LOCATIONS: MapLocation[] = [
  {
    id: 'main-building',
    name: '校舍本馆',
    label: '本馆',
    category: 'teach',
    x: 42,
    y: 38,
    locationHint: '教学区 · 校园中央偏前方',
    summary:
      '学园的主教学楼与行政中枢，一到五层分别是一年级到三年级教室、教职员室，以及校长室、理事长室等。大部分白天课程都会在这里进行。',
    highlights: [
      '屋顶平台与园艺部温室位于屋顶，是放学后约会与秘密谈话的热门地点。',
      '三楼靠近楼梯的区域是学生会室，经常会有风纪检查或学生会会议。',
      '一楼升降口与中央大厅，是早晚与放学人流最密集的地方。',
    ],
  },
  {
    id: 'lab-building',
    name: '综合实验楼',
    label: '实验楼',
    category: 'teach',
    x: 60,
    y: 32,
    locationHint: '教学区 · 本馆右侧',
    summary:
      '理科实验室、图书室、自习室、美术室、音乐室等都集中在这栋现代化建筑内，是文化社团与成绩优等生常驻的区域。',
    highlights: [
      '三楼的综合图书室与独立自习室气氛安静，适合偷听、偶遇和制造“偶然邂逅”。',
      '二楼的理科实验室和视听室，经常会因为课程安排出现「只有少数人留下」的时间段。',
    ],
  },
  {
    id: 'canteen',
    name: '餐饮与医疗综合馆',
    label: '食堂·保健',
    category: 'life',
    x: 28,
    y: 48,
    locationHint: '生活区 · 本馆左下方的独立建筑',
    summary:
      '一楼是宽敞的学生食堂与露天咖啡区，二楼则是教职工餐厅与保健中心。中午与放学后都十分热闹。',
    highlights: [
      '食堂的落地窗面向中庭，可以从远处观察来往学生的动向。',
      '校医室与保健中心位于楼上，是发生“意外”后最自然的去处。',
    ],
  },
  {
    id: 'gym',
    name: '体育馆主馆',
    label: '体育馆',
    category: 'sport',
    x: 70,
    y: 52,
    locationHint: '运动区 · 靠近运动场一侧',
    summary:
      '用于全校集会、球技大会和各类室内运动赛事的大型体育馆。一楼是主场地与器材室，二楼为观众看台与通道。',
    highlights: [
      '更衣室与淋浴间位于侧翼深处，动线相对隐蔽。',
      '球技大会、体育祭等大型活动时，这里会成为全校视线的中心。',
    ],
  },
  {
    id: 'club-building',
    name: '社团大楼（部室栋）',
    label: '社团栋',
    category: 'sport',
    x: 76,
    y: 40,
    locationHint: '运动区 · 体育馆旁',
    summary:
      '集中安置各种文化社团、运动部的部室。放学后直到傍晚都是人来人往的时间段，社团招新周更是异常喧闹。',
    highlights: [
      '二楼多为文化社团，房门常常半掩着，是“被路过的人看到一眼”的尴尬场景制造机。',
      '一楼连接运动场，方便运动部在练习与休息间往返。',
    ],
  },
  {
    id: 'dorm-girls',
    name: '女生宿舍',
    label: '女生宿',
    category: 'life',
    x: 20,
    y: 26,
    locationHint: '宿舍区 · 校园左上角',
    summary:
      '高规格的女生专用宿舍，管理严格但内装接近高级公寓。多数千金与有钱人家的女儿都会选择入住这里。',
    highlights: ['宿舍区与教学楼之间有规定的通学路线，早晚都会出现固定的“人流时间”。'],
  },
  {
    id: 'dorm-boys',
    name: '男生宿舍',
    label: '男生宿',
    category: 'life',
    x: 24,
    y: 18,
    locationHint: '宿舍区 · 靠近校园边缘',
    summary:
      '由于男生人数极少，男生宿舍规模不大，气氛也与女生宿舍完全不同，更像是被遗忘在角落的小据点。',
    highlights: ['从这里前往教学楼的途中，能明显感受到自己被淹没在女生人海之中的视线差异。'],
  },
  {
    id: 'gate',
    name: '正门与林荫大道',
    label: '正门',
    category: 'outdoor',
    x: 50,
    y: 70,
    locationHint: '户外 · 校园前端',
    summary:
      '带有巨大锻铁校门与石碑的正式出入口，往里是一条笔直的林荫大道，尽头连向欧式中庭与校舍本馆。',
    highlights: [
      '每天的登校与放学都会在这里形成“流量高峰”，是观察全校人群氛围的最佳地点。',
      '地下停车场入口隐蔽在一侧，供教职工与大小姐们的专车使用。',
    ],
  },
  {
    id: 'field',
    name: '运动场区域',
    label: '运动场',
    category: 'sport',
    x: 80,
    y: 64,
    locationHint: '运动区 · 校园右下角',
    summary:
      '大操场、跑道、网球场、弓道场与马术练习场等运动设施集中在此，是体育课与各类比赛的主要舞台。',
    highlights: [
      '球技大会、体育祭、社团联合训练都会在这里发生，氛围从远处就能感受到热度。',
      '视野开阔，黄昏时分的天空与灯光会给人一种“故事即将发生”的预感。',
    ],
  },
  {
    id: 'back-mountain',
    name: '后山与旧校舍',
    label: '后山',
    category: 'outdoor',
    x: 10,
    y: 60,
    locationHint: '户外 · 校园后方边缘',
    summary:
      '校园后侧的幽静区域，有小树林与被封锁的旧校舍。传闻中经常与“试胆大会”或都市怪谈联系在一起。',
    highlights: [
      '白天几乎没什么人刻意经过，夜间更是容易让人产生“只属于我们两人的空间”错觉。',
      '旧校舍虽然被官方标注为危险区域，但总会有人偷偷摸进去。',
    ],
  },
];

function categoryName(c: MapCategory): string {
  switch (c) {
    case 'teach':
      return '教学区';
    case 'life':
      return '生活区';
    case 'sport':
      return '运动区';
    case 'outdoor':
      return '户外/边缘';
    default:
      return '';
  }
}

export const CampusMapApp = ({ onBack }: { onBack: () => void }) => {
  const [selectedId, setSelectedId] = useState<string>(CAMPUS_LOCATIONS[0]?.id ?? 'main-building');
  const selected = useMemo(
    () => CAMPUS_LOCATIONS.find(l => l.id === selectedId) ?? CAMPUS_LOCATIONS[0],
    [selectedId],
  );

  // 简单可拖动：限制在屏幕中，不做边界计算，只是相对偏移
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; originX: number; originY: number }>({
    dragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragState.current.dragging) return;
      const dx = e.clientX - dragState.current.startX;
      const dy = e.clientY - dragState.current.startY;
      setOffset({ x: dragState.current.originX + dx, y: dragState.current.originY + dy });
    };
    const onUp = () => {
      dragState.current.dragging = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const beginDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    dragState.current.dragging = true;
    dragState.current.startX = e.clientX;
    dragState.current.startY = e.clientY;
    dragState.current.originX = offset.x;
    dragState.current.originY = offset.y;
  };

  return (
    <PageLayout title="校园地图" onBack={onBack} color="bg-slate-900">
      <div className="relative h-full w-full">
        <div
          className="absolute left-1/2 top-1/2 w-[95%] max-w-none md:max-w-[420px] -translate-x-1/2 -translate-y-1/2"
          style={{ transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }}
        >
          <div className="rounded-2xl border border-slate-600/80 bg-slate-950/95 shadow-2xl overflow-hidden">
            <div
              className="flex items-center justify-between px-3 py-2 bg-slate-900 cursor-move select-none text-xs text-slate-200/80"
              onMouseDown={beginDrag}
            >
              <span>斋明学园 · 校园地图</span>
              <span className="text-[10px] text-slate-400">拖拽顶部可以移动</span>
            </div>

            <div className="px-3 pt-2 pb-3 text-[11px] text-slate-200/80">
              这是斋明学园的简易俯视地图，用来帮助你在脑中构建校园的大致结构。
            </div>

            <div className="px-3 pb-3">
              <div className="flex flex-col lg:flex-row gap-3">
                {/* 地图画布 */}
                <div className="flex-1 min-w-0">
                  <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-gradient-to-b from-slate-800 to-slate-950 shadow-inner">
                    {/* 网格背景 */}
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(148,163,184,0.35)_1px,transparent_1px)] bg-[length:20px_20px]" />
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.35)_1px,transparent_1px)] bg-[length:20px_20px]" />
                    </div>

                    {/* 地点标记 */}
                    {CAMPUS_LOCATIONS.map(loc => (
                      <button
                        key={loc.id}
                        type="button"
                        className={[
                          'absolute -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] border',
                          loc.id === selectedId
                            ? 'bg-slate-900 text-slate-50 border-indigo-400 shadow-lg'
                            : 'bg-slate-900/80 text-slate-100 border-slate-500/60 hover:border-indigo-300',
                        ].join(' ')}
                        style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
                        onClick={() => setSelectedId(loc.id)}
                      >
                        <span
                          className={[
                            'w-2 h-2 rounded-full',
                            loc.category === 'teach'
                              ? 'bg-indigo-400'
                              : loc.category === 'life'
                                ? 'bg-pink-400'
                                : loc.category === 'sport'
                                  ? 'bg-emerald-400'
                                  : 'bg-slate-100',
                          ].join(' ')}
                        />
                        <span>{loc.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* 图例 */}
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-300">
                    <span className="px-2 py-0.5 rounded-full border border-indigo-400/70 bg-slate-900/70">
                      教学区
                    </span>
                    <span className="px-2 py-0.5 rounded-full border border-pink-400/70 bg-slate-900/70">生活区</span>
                    <span className="px-2 py-0.5 rounded-full border border-emerald-400/70 bg-slate-900/70">
                      运动区
                    </span>
                    <span className="px-2 py-0.5 rounded-full border border-slate-200/70 bg-slate-900/70">
                      户外/边缘
                    </span>
                  </div>
                </div>

                {/* 右侧/下方信息面板 */}
                <div className="w-full lg:w-[45%] min-w-[40%]">
                  <div className="rounded-xl border border-slate-600 bg-slate-950/90 p-3 h-full flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                      <span
                        className={[
                          'self-start px-2 py-0.5 rounded-full text-[10px] border',
                          selected.category === 'teach'
                            ? 'border-indigo-400 text-indigo-200'
                            : selected.category === 'life'
                              ? 'border-pink-400 text-pink-200'
                              : selected.category === 'sport'
                                ? 'border-emerald-400 text-emerald-200'
                                : 'border-slate-200 text-slate-100',
                        ].join(' ')}
                      >
                        {categoryName(selected.category)}
                      </span>
                      <div className="text-sm font-semibold text-slate-50">{selected.name}</div>
                      <div className="text-[11px] text-slate-300">{selected.locationHint}</div>
                    </div>

                    <p className="text-[11px] leading-relaxed text-slate-200">{selected.summary}</p>

                    {selected.highlights && selected.highlights.length > 0 && (
                      <ul className="mt-1 space-y-1 text-[11px] text-slate-200/90 list-disc pl-4">
                        {selected.highlights.map((h, idx) => (
                          <li key={idx}>{h}</li>
                        ))}
                      </ul>
                    )}

                    <p className="mt-auto pt-1 text-[10px] text-slate-400">
                      这是示意图而非精确比例地图，只用于给玩家提供大致的空间感和代入感。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

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

const BodyScanApp: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [vipUnlocked, setVipUnlocked] = useState(false);
  const [roles, setRoles] = useState<RoleMap>({});
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshRef = useRef<() => void>(() => {});
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
    () => nonBarEntries.filter(([k, v]) => isScalarValue(v) && !k.includes('敏感度') && !k.includes('高潮次数')),
    [nonBarEntries],
  );

  const complexEntries = useMemo(() => nonBarEntries.filter(([, v]) => !isScalarValue(v)), [nonBarEntries]);

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

export const CalendarApp = ({ onBack }: { onBack: () => void }) => <CalendarDarkApp onBack={onBack} />;

type CalendarEvent = {
  start: number;
  end: number;
  title: string;
  kind: 'holiday' | 'festival' | 'event';
};

const SCHOOL_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3] as const;
const MONTH_LENGTHS: Record<number, number> = {
  1: 31,
  2: 28,
  3: 31,
  4: 30,
  5: 31,
  6: 30,
  7: 31,
  8: 31,
  9: 30,
  10: 31,
  11: 30,
  12: 31,
};

function inferEventKind(title: string): CalendarEvent['kind'] {
  if (title.includes('祝日') || title.includes('振替休日')) return 'holiday';
  const festivals = [
    '七夕',
    '万圣节',
    '元旦',
    '圣诞节',
    '平安夜',
    '大晦日',
    '盂兰盆节',
    '情人节',
    '白色情人节',
    '女儿节',
    '节分',
    '七五三节',
    '愚人节',
  ];
  if (festivals.some(key => title.includes(key))) return 'festival';
  return 'event';
}

function ev(start: number, end: number, title: string): CalendarEvent {
  return { start, end, title, kind: inferEventKind(title) };
}

const CALENDAR_EVENTS: Record<number, CalendarEvent[]> = {
  4: [
    ev(1, 1, '愚人节'),
    ev(8, 8, '入学式/始业式'),
    ev(10, 14, '社团招新周'),
    ev(15, 15, '社团说明会'),
    ev(20, 20, '身体检查'),
    ev(29, 29, '黄金周假期开始'),
  ],
  5: [ev(6, 6, '黄金周假期结束'), ev(20, 23, '第一学期中考'), ev(25, 25, '球技大会')],
  6: [ev(1, 1, '衣更(换夏装)'), ev(10, 10, '全校体力测验'), ev(25, 25, '学生会选举'), ev(30, 30, '夜间试胆大会')],
  7: [
    ev(7, 7, '七夕'),
    ev(14, 17, '第一学期末考'),
    ev(21, 21, '海之日(7月第3周一/祝日)'),
    ev(22, 22, '第一学期结业式'),
    ev(23, 23, '暑假开始'),
    ev(25, 28, '社团夏季合宿'),
  ],
  8: [
    ev(1, 1, '全校返校日'),
    ev(11, 11, '山之日(祝日)'),
    ev(13, 16, '盂兰盆节'),
    ev(16, 17, '夏Comi(同人展/东京BigSight)'),
    ev(25, 25, '补习/作业最后冲刺'),
    ev(31, 31, '暑假最后一日'),
  ],
  9: [
    ev(1, 1, '第二学期始业式'),
    ev(15, 15, '敬老之日(9月第3周一/祝日)'),
    ev(16, 16, '校庆执行委员会成立 / 班级展出项目决定'),
    ev(23, 23, '秋分之日(祝日)'),
    ev(29, 29, '体育祭(运动会)'),
  ],
  10: [
    ev(1, 1, '衣更(换冬装)'),
    ev(13, 13, '运动之日(10月第2周一/祝日)'),
    ev(21, 24, '第二学期中考'),
    ev(31, 31, '万圣节放学后的Cosplay派对'),
  ],
  11: [
    ev(1, 2, '文化祭(学园祭)'),
    ev(3, 3, '文化之日(祝日/文化祭后夜祭)'),
    ev(15, 15, '七五三节'),
    ev(23, 23, '勤劳感谢日(祝日)'),
    ev(24, 24, '振替休日(补假)'),
    ev(25, 28, '修学旅行'),
  ],
  12: [
    ev(9, 12, '第二学期末考'),
    ev(24, 24, '第二学期结业式/平安夜'),
    ev(25, 25, '圣诞节/寒假开始'),
    ev(30, 31, '冬Comi(同人展)'),
    ev(31, 31, '大晦日(除夕)'),
  ],
  1: [
    ev(1, 1, '元旦(祝日)'),
    ev(7, 7, '第三学期始业式'),
    ev(13, 13, '成人之日(1月第2周一/祝日)'),
    ev(17, 18, '大学入学共通测试(三年级/校内禁声)'),
    ev(25, 25, '马拉松大会/耐力跑'),
  ],
  2: [
    ev(3, 3, '节分(撒豆驱鬼)'),
    ev(11, 11, '建国纪念日(祝日)'),
    ev(14, 14, '情人节'),
    ev(23, 23, '天皇诞辰(祝日)'),
    ev(24, 24, '振替休日(补假)'),
    ev(25, 27, '学年末考试(一二年级)'),
  ],
  3: [
    ev(3, 3, '女儿节'),
    ev(14, 14, '白色情人节'),
    ev(20, 20, '春分之日(祝日)'),
    ev(24, 24, '修业式(年度结束)'),
    ev(25, 25, '春假开始'),
  ],
};

function eventsForDay(month: number, day: number): CalendarEvent[] {
  const list = CALENDAR_EVENTS[month] ?? [];
  return list.filter(e => day >= e.start && day <= e.end);
}

function formatEventTitleForCell(e: CalendarEvent): string {
  const main = e.title.split('(')[0].split('/')[0].trim();
  return main.length > 6 ? main.slice(0, 6) + '…' : main;
}

function parseSystemDate(
  raw: unknown,
): { month: number; day: number; weekdayIndex: number | null; weekdayLabel: string | null } | null {
  if (typeof raw !== 'string') return null;
  const monthMatch = /(\d{1,2})\s*月/.exec(raw);
  const dayMatch = /(\d{1,2})\s*日/.exec(raw);
  if (!monthMatch || !dayMatch) return null;
  const month = Number(monthMatch[1]);
  const day = Number(dayMatch[1]);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return null;
  const weekMatch = /(星期|周)\s*([一二三四五六日天])/.exec(raw);
  const weekdayLabel = weekMatch ? `${weekMatch[1]}${weekMatch[2]}` : null;
  const weekdayIndex = (() => {
    if (!weekMatch) return null;
    const map: Record<string, number> = { 日: 0, 天: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };
    return map[weekMatch[2]] ?? null;
  })();
  return { month, day, weekdayIndex, weekdayLabel };
}

function offsetFromApril1(month: number, day: number): number {
  const idx = SCHOOL_MONTHS.indexOf(month as any);
  if (idx < 0) return 0;
  let sum = 0;
  for (let i = 0; i < idx; i++) sum += MONTH_LENGTHS[SCHOOL_MONTHS[i]];
  sum += Math.max(0, day - 1);
  return sum;
}

function monthStartOffset(month: number): number {
  const idx = SCHOOL_MONTHS.indexOf(month as any);
  if (idx < 0) return 0;
  let sum = 0;
  for (let i = 0; i < idx; i++) sum += MONTH_LENGTHS[SCHOOL_MONTHS[i]];
  return sum;
}

function weekdayLabelFromIndex(idx: number): string {
  const map = ['日', '一', '二', '三', '四', '五', '六'];
  return `周${map[idx] ?? '·'}`;
}

const CalendarDarkApp: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [system, setSystem] = useState<Record<string, any> | null>(null);
  const [currentDate, setCurrentDate] = useState<ReturnType<typeof parseSystemDate> | null>(null);
  const [displayedMonth, setDisplayedMonth] = useState<number>(4);
  const [displayedYearOffset, setDisplayedYearOffset] = useState<number>(0);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const didInitRef = useRef(false);

  const loadSystem = async () => {
    const sys = await MvuBridge.getSystem();
    setSystem(sys);
    setCurrentDate(parseSystemDate(sys?.当前日期));
  };

  useEffect(() => {
    void loadSystem();
  }, []);

  useEffect(() => {
    let stops: Array<{ stop: () => void }> = [];
    void (async () => {
      try {
        const ready = await waitForMvuReady({ timeoutMs: 5000, pollMs: 150 });
        if (!ready) return;
        stops = [
          eventOn(Mvu.events.VARIABLE_INITIALIZED, () => void loadSystem()),
          eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, () => void loadSystem()),
        ];
      } catch {
        // ignore
      }
    })();
    return () => stops.forEach(s => s.stop());
  }, []);

  useEffect(() => {
    if (!currentDate || didInitRef.current) return;
    didInitRef.current = true;
    setDisplayedMonth(currentDate.month);
    setDisplayedYearOffset(0);
    setSelectedDay(currentDate.day);
  }, [currentDate]);

  const april1Weekday = useMemo(() => {
    if (!currentDate || currentDate.weekdayIndex === null) return 0;
    const off = offsetFromApril1(currentDate.month, currentDate.day) % 7;
    return (currentDate.weekdayIndex - off + 7) % 7;
  }, [currentDate]);

  const startWeekday = useMemo(() => {
    const yearShift = ((displayedYearOffset % 7) + 7) % 7; // 365 % 7 = 1
    return (april1Weekday + yearShift + (monthStartOffset(displayedMonth) % 7)) % 7;
  }, [april1Weekday, displayedMonth, displayedYearOffset]);

  const daysInMonth = MONTH_LENGTHS[displayedMonth] ?? 30;

  const gridCells = useMemo(() => {
    const cells: Array<number | null> = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    while (cells.length < 42) cells.push(null);
    return cells;
  }, [startWeekday, daysInMonth]);

  const monthIdx = useMemo(() => SCHOOL_MONTHS.indexOf(displayedMonth as any), [displayedMonth]);
  const canSwitch = monthIdx >= 0;

  const goMonth = (delta: -1 | 1) => {
    if (!canSwitch) return;
    const yearDelta =
      delta === 1 && monthIdx === SCHOOL_MONTHS.length - 1 ? 1 : delta === -1 && monthIdx === 0 ? -1 : 0;
    const nextYearOffset = displayedYearOffset + yearDelta;
    const nextIdx = (monthIdx + delta + SCHOOL_MONTHS.length) % SCHOOL_MONTHS.length;
    const nextMonth = SCHOOL_MONTHS[nextIdx];
    setDisplayedYearOffset(nextYearOffset);
    setDisplayedMonth(nextMonth);
    if (currentDate && currentDate.month === nextMonth && nextYearOffset === 0) {
      setSelectedDay(currentDate.day);
    } else {
      setSelectedDay(1);
    }
  };

  const todayDay = currentDate?.day ?? null;
  const todayMonth = currentDate?.month ?? null;
  const todayWeek =
    currentDate?.weekdayLabel ??
    (currentDate?.weekdayIndex !== null && currentDate?.weekdayIndex !== undefined
      ? weekdayLabelFromIndex(currentDate.weekdayIndex)
      : null);
  const schedule = typeof system?.当前日程 === 'string' ? system.当前日程 : null;
  const location = typeof system?.当前地点 === 'string' ? system.当前地点 : null;

  const selectedEvents = useMemo(() => {
    if (!selectedDay) return [];
    return eventsForDay(displayedMonth, selectedDay);
  }, [displayedMonth, selectedDay]);

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-950 via-slate-950 to-black text-white overflow-hidden animate-fade-in">
      <div className="px-4 pt-6 pb-4 border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft size={18} className="text-white/80" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => goMonth(-1)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="上个月"
            >
              <ChevronLeft size={18} className="text-white/70" />
            </button>
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-white/10 bg-white/5">
              <CalendarIcon size={16} className="text-cyan-300" />
              <div className="text-sm font-bold tracking-wide">{displayedMonth}月</div>
            </div>
            <button
              onClick={() => goMonth(1)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="下个月"
            >
              <ChevronRight size={18} className="text-white/70" />
            </button>
          </div>

          <div className="w-9" />
        </div>

        {displayedYearOffset === 0 &&
          todayMonth === displayedMonth &&
          todayDay &&
          (todayWeek || schedule || location) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {todayWeek && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white/60">
                今日 {todayDay}日 · {todayWeek}
              </span>
            )}
            {schedule && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-200">
                {schedule}
              </span>
            )}
            {location && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-200">
                {location}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
        <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-white/45 select-none">
          <div className="text-red-300/70">日</div>
          <div>一</div>
          <div>二</div>
          <div>三</div>
          <div>四</div>
          <div>五</div>
          <div className="text-red-300/70">六</div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {gridCells.map((day, idx) => {
            if (!day) {
              return <div key={idx} className="aspect-square rounded-xl border border-white/5 bg-white/0" />;
            }

            const isToday = displayedYearOffset === 0 && todayMonth === displayedMonth && todayDay === day;
            const isSelected = selectedDay === day;
            const events = eventsForDay(displayedMonth, day);
            const hasHoliday = events.some(e => e.kind === 'holiday');
            const hasFestival = events.some(e => e.kind === 'festival');
            const primary = events[0] ? formatEventTitleForCell(events[0]) : null;

            return (
              <button
                key={idx}
                onClick={() => setSelectedDay(day)}
                className={[
                  'aspect-square rounded-xl border p-2 flex flex-col items-start justify-between text-left transition-colors',
                  'bg-black/20 hover:bg-white/5',
                  isSelected ? 'border-cyan-400/40' : 'border-white/10',
                  isToday ? 'ring-2 ring-cyan-400/30 shadow-[0_0_0_4px_rgba(34,211,238,0.08)]' : '',
                ].join(' ')}
              >
                <div className="w-full flex items-start justify-between">
                  <div
                    className={['text-[11px] font-bold tabular-nums', isToday ? 'text-cyan-200' : 'text-white/80'].join(
                      ' ',
                    )}
                  >
                    {day}
                  </div>
                  {(hasHoliday || hasFestival) && (
                    <div
                      className={[
                        'text-[9px] px-1.5 py-0.5 rounded-full border',
                        hasHoliday
                          ? 'bg-red-500/10 border-red-400/30 text-red-200'
                          : 'bg-fuchsia-500/10 border-fuchsia-400/30 text-fuchsia-200',
                      ].join(' ')}
                    >
                      {hasHoliday ? '祝' : '节'}
                    </div>
                  )}
                </div>

                <div className="w-full">
                  {primary && (
                    <div
                      className={[
                        'text-[9px] leading-tight truncate',
                        hasHoliday ? 'text-red-200/90' : hasFestival ? 'text-fuchsia-200/90' : 'text-white/55',
                      ].join(' ')}
                    >
                      {primary}
                      {events.length > 1 ? ` +${events.length - 1}` : ''}
                    </div>
                  )}
                  {events.length > 0 && (
                    <div className="mt-1 flex items-center gap-1">
                      {events.slice(0, 3).map((e, i) => (
                        <span
                          key={i}
                          className={[
                            'w-1.5 h-1.5 rounded-full',
                            e.kind === 'holiday'
                              ? 'bg-red-400/80'
                              : e.kind === 'festival'
                                ? 'bg-fuchsia-400/80'
                                : 'bg-white/25',
                          ].join(' ')}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-white/80">
              {displayedMonth}月{selectedDay}日
              {todayMonth === displayedMonth && todayDay === selectedDay && (
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-200">
                  今日
                </span>
              )}
            </div>
            <div className="text-[10px] text-white/40">{selectedEvents.length} 项</div>
          </div>

          {selectedEvents.length === 0 ? (
            <div className="text-[11px] text-white/45">今日无记录事件</div>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((e, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-white/10 bg-black/20 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-white/85 truncate">{e.title}</div>
                    {e.start !== e.end && (
                      <div className="text-[10px] text-white/45 mt-0.5">
                        {displayedMonth}月{e.start}-{e.end}日
                      </div>
                    )}
                  </div>
                  <div
                    className={[
                      'shrink-0 text-[10px] px-2 py-1 rounded-full border',
                      e.kind === 'holiday'
                        ? 'bg-red-500/10 border-red-400/30 text-red-200'
                        : e.kind === 'festival'
                          ? 'bg-fuchsia-500/10 border-fuchsia-400/30 text-fuchsia-200'
                          : 'bg-white/5 border-white/10 text-white/55',
                    ].join(' ')}
                  >
                    {e.kind === 'holiday' ? '祝日' : e.kind === 'festival' ? '节日' : '事件'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
            <HelpSection title="MC 点">用来解锁功能，以及提高 MC 能量上限。</HelpSection>
            <HelpSection title="金钱">用来购买物品，也可购买 MC 能量与 MC 点。</HelpSection>
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
              在社会看来主角有多可疑。肆无忌惮使用催眠 APP 会增加（例如被多人目击，或直接用催眠获取金钱）。每天自然减少
              10 点。
            </HelpSection>
            <HelpSection title="金钱来源">
              金钱可以来自打工，也可以直接催眠拿钱；更鼓励用更有创意的玩法去利用催眠 APP 的各种功能。
            </HelpSection>
          </div>
        ),
      },
      {
        id: 'mc-points',
        title: '如何获取 MC 点数？',
        content: <div className="text-sm text-gray-600">通过完成成就, 任务, 氪金, 或让角色高潮.</div>,
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
