import { ArrowLeft, ChevronDown, ChevronUp, Clock, Lock, StopCircle, Zap } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { buildHypnosisSendMessage } from '../prompts/hypnosisSend';
import { DataService, SUBSCRIPTION_PRICES } from '../services/dataService';
import { MvuBridge } from '../services/mvuBridge';
import { HypnosisFeature, UserResources, VIP_LEVELS } from '../types';

interface HypnosisAppProps {
  userData: UserResources;
  onUpdateUser: (data: UserResources) => void;
  onExit: () => void;
}

// --- SVG Logo Component ---
// Exported for use in App.tsx as the icon
export const HypnoLogoSVG = ({
  className,
  size = 24,
  ...props
}: {
  className?: string;
  size?: number | string;
  [key: string]: any;
}) => (
  <svg viewBox="0 0 200 200" className={className} width={size} height={size} {...props}>
    <defs>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <g fill="currentColor" filter="url(#glow)">
      {/* Top Left Spike */}
      <path d="M 45 60 L 40 20 L 75 65" />
      {/* Top Middle Spike */}
      <path d="M 85 55 L 100 5 L 115 55" />
      {/* Top Right Spike */}
      <path d="M 155 60 L 160 20 L 125 65" />

      {/* Main Body (Oval-ish) */}
      <path d="M 10 100 C 10 40 190 40 190 100 C 190 160 10 160 10 100 Z" />

      {/* Bottom Spike */}
      <path d="M 70 145 L 100 195 L 130 145" />
    </g>

    {/* Inner Eye (Cutout via black fill) */}
    <ellipse cx="100" cy="100" rx="55" ry="28" fill="#0f0518" />

    {/* Pupil */}
    <circle cx="100" cy="100" r="18" fill="currentColor" filter="url(#glow)" />
  </svg>
);

// --- Vortex Background Component (Spiral SVG) ---
const VortexBackground = ({ speed = 'spin-slow' }: { speed?: string }) => {
  // Generate a spiral path
  // Center is 500, 500.
  const center = 500;
  const generateSpiralPath = (offsetAngle: number) => {
    let path = `M ${center} ${center} `;
    const loops = 4;
    const pointsPerLoop = 20;
    const maxRadius = 800;

    for (let i = 0; i <= loops * pointsPerLoop; i++) {
      const angle = (i / pointsPerLoop) * Math.PI * 2 + offsetAngle;
      // Exponential growth for "sucked in" look (smaller in center, wider at edges)
      const t = i / (loops * pointsPerLoop);
      const radius = Math.pow(t, 1.5) * maxRadius;

      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;
      path += `L ${x} ${y} `;
    }
    return path;
  };

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0f0518] pointer-events-none">
      {/* Rotating Spiral SVG */}
      <div
        className="absolute inset-[-50%] animate-[spin_4s_linear_infinite]"
        style={{ animationDuration: speed === 'spin-slow' ? '12s' : '4s' }}
      >
        <svg viewBox="0 0 1000 1000" className="w-full h-full opacity-80 blur-xl">
          <defs>
            <linearGradient id="spiralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4a044e" stopOpacity="0" />
              <stop offset="50%" stopColor="#d946ef" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          {/* Draw multiple arms */}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <path
              key={i}
              d={generateSpiralPath((i / 6) * Math.PI * 2)}
              fill="none"
              stroke="url(#spiralGrad)"
              strokeWidth={40 + i * 5}
              strokeLinecap="round"
            />
          ))}
        </svg>
      </div>

      {/* Strong Radial Overlay for "Sucked In" Dark Center */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#000000_15%,transparent_70%)]"></div>

      {/* Edge Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,#4a044e_100%)] mix-blend-overlay opacity-60"></div>
    </div>
  );
};

// --- Transition View (Initialization) --- 供催眠 APP / NTR 催眠发送后全屏动画复用
export const HypnosisTransitionView = () => {
  const [percent, setPercent] = useState(0);
  const [startAnim, setStartAnim] = useState(false);

  useEffect(() => {
    // 1. Start the bar animation immediately
    const timeout = setTimeout(() => {
      setStartAnim(true);
    }, 50); // Short delay to ensure mount

    // 2. Start the number counter
    const fillDuration = 3000;
    const startTime = Date.now();
    let rafId: number;

    const frame = () => {
      const now = Date.now();
      const elapsed = now - startTime;

      // Calculate progress 0-100 purely for text
      let p = (elapsed / fillDuration) * 100;
      if (p > 100) p = 100;

      setPercent(p);

      if (p < 100) {
        rafId = requestAnimationFrame(frame);
      }
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden animate-fade-in font-sans">
      <VortexBackground speed="spin" />

      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full pb-10">
        {/* Title Text */}
        <h1
          className="text-5xl font-black text-[#d946ef] mb-12 tracking-widest select-none drop-shadow-[0_0_15px_rgba(217,70,239,0.8)]"
          style={{
            fontFamily: '"Noto Sans SC", sans-serif',
          }}
        >
          催眠アプリ
        </h1>

        {/* Logo */}
        <div className="w-64 h-64 mb-24 animate-breathing drop-shadow-[0_0_30px_rgba(217,70,239,0.5)]">
          <HypnoLogoSVG className="text-[#d946ef] w-full h-full filter drop-shadow-[0_0_10px_#ff00ff]" />
        </div>

        {/* Progress Bar Container - Positioned at bottom */}
        <div className="absolute bottom-20 w-[80%] max-w-xs">
          <div className="w-full h-6 bg-gray-900/90 border border-[#d946ef]/50 rounded-full overflow-hidden backdrop-blur-md p-1 shadow-[0_0_20px_rgba(217,70,239,0.3)]">
            {/* Progress Fill */}
            {/* We use CSS transition for width to guarantee smoothness over 3s */}
            <div
              className="h-full bg-gradient-to-r from-purple-800 via-[#d946ef] to-pink-400 rounded-full shadow-[0_0_15px_#d946ef] relative"
              style={{
                width: startAnim ? '100%' : '0%',
                transition: 'width 3000ms linear',
              }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
          <div className="flex justify-between mt-2 px-1">
            <span className="text-[10px] text-[#d946ef] font-mono tracking-widest animate-pulse">
              SYSTEM INITIALIZING...
            </span>
            <span className="text-[12px] text-[#d946ef] font-mono font-bold">{Math.floor(percent)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Active Session View (Countdown) ---
const ActiveSessionView = ({
  timeLeft,
  sessionEndVirtualMinutes,
  sessionEndAtMs,
  onStop,
}: {
  timeLeft: number;
  sessionEndVirtualMinutes: number | null;
  sessionEndAtMs: number | null;
  onStop: () => void;
}) => {
  const [remaining, setRemaining] = useState(timeLeft);

  useEffect(() => {
    let stopped = false;
    let lastRemaining = timeLeft;
    const tick = async () => {
      if (stopped) return;
      if (sessionEndVirtualMinutes !== null) {
        const clock = await DataService.getSystemClock();
        if (stopped) return;
        if (clock.virtualMinutes !== null) {
          const remainingMinutes = sessionEndVirtualMinutes - clock.virtualMinutes;
          const next = Math.max(0, Math.ceil(remainingMinutes * 60));
          setRemaining(next);
          if (next <= 0) onStop();
          return;
        }
      }

      if (sessionEndAtMs !== null) {
        const next = Math.max(0, Math.ceil((sessionEndAtMs - Date.now()) / 1000));
        setRemaining(next);
        if (next <= 0) onStop();
        return;
      }

      lastRemaining = Math.max(0, lastRemaining - 1);
      setRemaining(lastRemaining);
      if (lastRemaining <= 0) onStop();
    };

    void tick();
    const timer = setInterval(() => void tick(), 1000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [onStop, sessionEndAtMs, sessionEndVirtualMinutes, timeLeft]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden animate-fade-in">
      <VortexBackground speed="spin-slow" />

      {/* Overlay Scanlines */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 bg-[length:100%_2px,3px_100%] pointer-events-none"></div>

      <div className="relative z-30 flex flex-col items-center w-full">
        {/* Header */}
        <h1
          className="text-4xl font-bold text-[#d946ef] mb-2 tracking-widest opacity-90 select-none"
          style={{ fontFamily: '"Noto Sans SC", sans-serif', textShadow: '0 0 10px #d946ef' }}
        >
          催眠アプリ
        </h1>
        <div className="text-pink-500/70 text-xs tracking-[0.5em] mb-12 uppercase font-bold animate-pulse">
          Running...
        </div>

        {/* Center Logo Watermark behind timer */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 opacity-20 pointer-events-none animate-pulse-slow">
          <HypnoLogoSVG className="text-[#d946ef] w-full h-full" />
        </div>

        {/* Timer */}
        <div className="text-8xl font-mono font-bold text-white drop-shadow-[0_0_20px_rgba(217,70,239,1)] tabular-nums tracking-tighter mb-16 relative z-10">
          {formatTime(remaining)}
        </div>

        {/* Stop Button */}
        <button
          onClick={onStop}
          className="group relative px-10 py-4 bg-black/60 border-2 border-[#d946ef] rounded-full overflow-hidden transition-all hover:bg-[#d946ef]/20 active:scale-95 shadow-[0_0_15px_#d946ef]"
        >
          <span className="relative z-10 text-[#d946ef] font-bold tracking-widest text-lg flex items-center gap-2">
            <StopCircle size={24} /> 解除
          </span>
        </button>
      </div>
    </div>
  );
};

export const HypnosisApp: React.FC<HypnosisAppProps> = ({ userData, onUpdateUser, onExit }) => {
  const normalizeDurationMinutes = (raw: string): number => {
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return 1;
    const minutes = Math.floor(numeric);
    if (minutes <= 0) return 1;
    return Math.min(9999, minutes);
  };

  // State
  const [features, setFeatures] = useState<HypnosisFeature[]>([]);
  const [isExpanded, setIsExpanded] = useState(false); // Controls the "Command Center" (Stats + Store)
  const containerRef = useRef<HTMLDivElement>(null);
  const commandCenterBaseRef = useRef<HTMLDivElement>(null);
  const footerControlsRef = useRef<HTMLDivElement>(null);
  const [commandCenterMaxHeightPx, setCommandCenterMaxHeightPx] = useState(512);
  const [durationInput, setDurationInput] = useState('10'); // Minutes
  const duration = normalizeDurationMinutes(durationInput);
  const [globalNote, setGlobalNote] = useState('');
  const [isClosing, setIsClosing] = useState(false); // For exit animation
  const [debugEnabled, setDebugEnabled] = useState(false);
  const debugToggleCountRef = useRef(0);
  const [nowVirtualMinutes, setNowVirtualMinutes] = useState<number | null>(null);
  const [subscription, setSubscription] = useState<{
    tier: 'VIP1' | 'VIP2' | 'VIP3' | 'VIP4' | 'VIP5';
    endVirtualMinutes: number;
    autoRenew: boolean;
  } | null>(null);
  const [subscriptionNotice, setSubscriptionNotice] = useState<string | null>(null);
  const [purchaseShakeFeatureId, setPurchaseShakeFeatureId] = useState<string | null>(null);
  const purchaseShakeTimerRef = useRef<number | null>(null);

  // Immersive Mode State
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionEndVirtualMinutes, setSessionEndVirtualMinutes] = useState<number | null>(null);
  const [sessionEndAtMs, setSessionEndAtMs] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Load Features on Mount
  useEffect(() => {
    let stopped = false;
    void (async () => {
      const [nextFeatures, nextDebug, nextSub] = await Promise.all([
        DataService.getFeatures(),
        DataService.getDebugEnabled().catch(() => false),
        DataService.getSubscription().catch(() => null),
      ]);
      if (stopped) return;
      setFeatures(nextFeatures);
      setDebugEnabled(nextDebug);
      setSubscription(nextSub as any);
    })();
    return () => {
      stopped = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (purchaseShakeTimerRef.current !== null) {
        window.clearTimeout(purchaseShakeTimerRef.current);
        purchaseShakeTimerRef.current = null;
      }
    };
  }, []);

  const triggerPurchaseShake = (featureId: string) => {
    if (purchaseShakeTimerRef.current !== null) window.clearTimeout(purchaseShakeTimerRef.current);

    setPurchaseShakeFeatureId(null);
    window.requestAnimationFrame(() => {
      setPurchaseShakeFeatureId(featureId);
      containerRef.current
        ?.querySelector<HTMLButtonElement>(`button[data-hypno-purchase="${featureId}"]`)
        ?.focus({ preventScroll: true });
    });

    purchaseShakeTimerRef.current = window.setTimeout(() => {
      setPurchaseShakeFeatureId(prev => (prev === featureId ? null : prev));
      purchaseShakeTimerRef.current = null;
    }, 500);
  };

  useEffect(() => {
    const update = () => {
      const containerEl = containerRef.current;
      const baseEl = commandCenterBaseRef.current;
      if (!containerEl || !baseEl) return;

      const containerHeight = containerEl.getBoundingClientRect().height;
      const footerHeight = footerControlsRef.current?.getBoundingClientRect().height ?? 0;
      const baseHeight = baseEl.getBoundingClientRect().height;

      const available = Math.max(0, containerHeight - footerHeight - baseHeight - 12);
      setCommandCenterMaxHeightPx(available);
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isExpanded]);

  useEffect(() => {
    let stopped = false;
    void (async () => {
      try {
        const end = await DataService.getSessionEnd();
        if (stopped) return;

        setSessionEndVirtualMinutes(end.endVirtualMinutes);
        setSessionEndAtMs(end.endAtMs);

        let remainingSeconds: number | null = null;
        if (end.endVirtualMinutes !== null) {
          try {
            const clock = await DataService.getSystemClock();
            if (!stopped && clock.virtualMinutes !== null) {
              remainingSeconds = Math.max(0, Math.ceil((end.endVirtualMinutes - clock.virtualMinutes) * 60));
            }
          } catch {
            // ignore
          }
        }

        if (remainingSeconds === null && end.endAtMs !== null) {
          remainingSeconds = Math.max(0, Math.ceil((end.endAtMs - Date.now()) / 1000));
        }

        if (remainingSeconds !== null && remainingSeconds > 0) {
          setTimeLeft(remainingSeconds);
          setIsActive(true);
          setIsTransitioning(false);
        } else if (end.endVirtualMinutes !== null || end.endAtMs !== null) {
          void DataService.clearSessionEnd();
        }
      } catch (err) {
        console.warn('[HypnoOS] 恢复催眠状态失败', err);
      }
    })();
    return () => {
      stopped = true;
    };
  }, []);

  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const clock = await DataService.getSystemClock();
        if (stopped) return;
        setNowVirtualMinutes(clock.virtualMinutes);

        const nextSub = await DataService.getSubscription();
        if (stopped) return;
        setSubscription(nextSub as any);
      } catch (err) {
        console.warn('[HypnoOS] 订阅/时间同步失败', err);
      }
    };

    void tick();
    const timer = setInterval(() => void tick(), 1000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [onUpdateUser]);

  // --- Logic Calculations ---

  useEffect(() => {
    if (duration !== 3614) debugToggleCountRef.current = 0;
  }, [duration]);

  const parseFirstNumber = (text: string | undefined): number | null => {
    if (!text) return null;
    const match = text.match(/(\d+)/);
    if (!match) return null;
    const n = Number(match[1]);
    return Number.isFinite(n) ? n : null;
  };

  const clampInt = (value: unknown, fallback: number, min: number, max: number) => {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return fallback;
    const i = Math.floor(n);
    return Math.max(min, Math.min(max, i));
  };

  const getFeatureNumericConfig = (
    feature: HypnosisFeature,
  ): {
    label: string;
    unit: string;
    min: number;
    max: number;
    step?: number;
    hint?: string;
  } | null => {
    switch (feature.id) {
      case 'vip1_temp_sensitivity':
        return { label: '敏感度增加', unit: '点', min: 1, max: 999, step: 1, hint: '每点2MC能量' };
      case 'vip1_estrus':
        return { label: '发情增加', unit: '', min: 1, max: 999, step: 1 };
      case 'vip1_memory_erase':
        return { label: '记忆消除时长', unit: '分钟', min: 1, max: 1440, step: 1 };
      case 'vip2_pleasure':
        return { label: '给予快感', unit: '', min: 1, max: 999, step: 1, hint: '一次性给予目标快感值' };
      default:
        return null;
    }
  };

  const accessContext = useMemo(
    () => ({ debugEnabled, subscription, nowVirtualMinutes }),
    [debugEnabled, nowVirtualMinutes, subscription],
  );
  const subscriptionTiers = useMemo(() => DataService.getSubscriptionTiers(), []);
  const subscriptionActive = useMemo(() => DataService.isSubscriptionActive(accessContext), [accessContext]);

  const hasAccessForFeature = (feature: HypnosisFeature) => DataService.canUseFeature(feature, accessContext);
  const isPurchasedForFeature = (feature: HypnosisFeature) => !feature.purchaseRequired || Boolean(feature.isPurchased);
  const canUseEnabledFeature = (feature: HypnosisFeature) =>
    hasAccessForFeature(feature) && isPurchasedForFeature(feature);

  useEffect(() => {
    const toDisable = features.filter(f => f.isEnabled && !canUseEnabledFeature(f));
    if (toDisable.length === 0) return;
    setFeatures(prev =>
      prev.map(f => (!f.isEnabled || canUseEnabledFeature(f) ? f : { ...f, isEnabled: false, userNote: '' })),
    );
    for (const f of toDisable) {
      void DataService.updateFeature(f.id, { isEnabled: false, userNote: '' });
    }
  }, [debugEnabled, features, nowVirtualMinutes, subscription, subscriptionActive]);

  const hasSessionFeaturesEnabled = useMemo(
    () => features.some(f => f.isEnabled && f.id !== 'vip1_stats' && canUseEnabledFeature(f)),
    [debugEnabled, features, nowVirtualMinutes, subscription, subscriptionActive],
  );

  const canSubscribeTier = (tier: 'VIP1' | 'VIP2' | 'VIP3' | 'VIP4' | 'VIP5') =>
    DataService.canSubscribeTier(tier, { debugEnabled, ptPoints: 0 });

  const remainingSubscriptionText = useMemo(() => {
    if (debugEnabled) return 'DEBUG 已解锁';
    if (!subscription) return '未购买';
    return `VIP${subscription.tier.slice(3)} 已永久解锁`;
  }, [debugEnabled, subscription]);

  // --- Handlers ---

  const handleExitApp = () => {
    setIsClosing(true);
    setTimeout(onExit, 300); // Wait for animation
  };

  const subscribeTier = async (tier: 'VIP1' | 'VIP2' | 'VIP3' | 'VIP4' | 'VIP5') => {
    const price = DataService.getSubscriptionUnlockThreshold(tier);
    void price;
    if (!canSubscribeTier(tier)) return;
    const result = await DataService.subscribeOrRenew({ tier });
    if (!result.ok) {
      window.alert(result.message || '购买失败');
      return;
    }
    const refreshed = await DataService.getUserData();
    onUpdateUser(refreshed);
    setSubscription(result.subscription ?? null);
    setSubscriptionNotice('购买成功');
    setTimeout(() => setSubscriptionNotice(null), 2000);
    void MvuBridge.appendThisTurnAppOperationLog(`购买 VIP${tier.slice(3)}`);
  };

  const purchaseFeature = async (feature: HypnosisFeature) => {
    const price = feature.purchasePricePoints ?? 0;
    const result = await DataService.purchaseFeature(feature.id);
    if (!result.ok || !result.user) {
      window.alert(result.message || '购买失败');
      return;
    }
    onUpdateUser(result.user);
    setFeatures(prev => prev.map(f => (f.id === feature.id ? { ...f, isPurchased: true } : f)));
    setSubscriptionNotice('已购买');
    setTimeout(() => setSubscriptionNotice(null), 1500);
    void MvuBridge.appendThisTurnAppOperationLog(`解锁功能「${feature.title}」`);
  };

  const enableDebugMode = async () => {
    await DataService.setDebugEnabled(true);
    setDebugEnabled(true);
    onUpdateUser({ ...userData });
  };

  const toggleFeature = (id: string) => {
    if (!debugEnabled) {
      if (duration === 3614 && id === 'trial_basic') {
        debugToggleCountRef.current += 1;
        if (debugToggleCountRef.current >= 10) {
          debugToggleCountRef.current = 0;
          void enableDebugMode();
        }
      } else {
        debugToggleCountRef.current = 0;
      }
    }

    const currentEnabled = features.find(f => f.id === id)?.isEnabled ?? false;
    const nextEnabled = !currentEnabled;

    const target = features.find(f => f.id === id);
    if (target && target.purchaseRequired && !target.isPurchased) {
      triggerPurchaseShake(id);
      return;
    }
    if (target && !hasAccessForFeature(target)) {
      return;
    }

    const getNumericDefault = (featureId: string): number | null => {
      switch (featureId) {
        case 'vip1_temp_sensitivity':
          return 1;
        case 'vip1_estrus':
          return 1;
        case 'vip1_memory_erase':
          return 10;
        case 'vip2_pleasure':
          return 3;
        default:
          return null;
      }
    };

    const nextNumber =
      nextEnabled && target && typeof target.userNumber === 'undefined' ? getNumericDefault(target.id) : null;

    setFeatures(prev =>
      prev.map(f =>
        f.id === id
          ? { ...f, isEnabled: !f.isEnabled, ...(nextNumber === null ? null : { userNumber: nextNumber }) }
          : f,
      ),
    );
    void DataService.updateFeature(id, {
      isEnabled: nextEnabled,
      ...(nextNumber === null ? null : { userNumber: nextNumber }),
    });
  };

  const updateFeatureNote = (id: string, note: string) => {
    setFeatures(prev => prev.map(f => (f.id === id ? { ...f, userNote: note } : f)));
    void DataService.updateFeature(id, { userNote: note });
  };

  const updateFeatureNumber = (id: string, value: number | null) => {
    setFeatures(prev => prev.map(f => (f.id === id ? { ...f, userNumber: value === null ? undefined : value } : f)));
    void DataService.updateFeature(id, { userNumber: value === null ? undefined : value });
  };

  const handleStart = async () => {
    setIsTransitioning(true);

    let endVirtualMinutes: number | null = null;
    try {
      const clock = await DataService.getSystemClock();
      if (clock.virtualMinutes !== null) endVirtualMinutes = clock.virtualMinutes + duration;
    } catch (err) {
      console.warn('[HypnoOS] 读取系统时间失败，回退到本地倒计时', err);
    }
    const endAtMs = Date.now() + duration * 60 * 1000;
    await DataService.setSessionEnd({ endVirtualMinutes, endAtMs });
    setSessionEndVirtualMinutes(endVirtualMinutes);
    setSessionEndAtMs(endAtMs);

    const enabledFeatures = features
      .filter(f => f.isEnabled && f.id !== 'vip1_stats' && canUseEnabledFeature(f))
      .map(f => f);

    await MvuBridge.appendThisTurnAppOperationLog(`启动催眠 ${duration}分钟`);

    try {
      const message = buildHypnosisSendMessage({
        features: enabledFeatures,
        durationMinutes: duration,
        globalNote,
      });

      const g = globalThis as typeof globalThis & Record<string, unknown>;
      const createChatMessagesFn =
        typeof g.createChatMessages === 'function'
          ? g.createChatMessages
          : ((g.parent as typeof g)?.['createChatMessages'] ?? (g.top as typeof g)?.['createChatMessages']);
      const triggerSlashFn =
        typeof g.triggerSlash === 'function'
          ? g.triggerSlash
          : ((g.parent as typeof g)?.['triggerSlash'] ?? (g.top as typeof g)?.['triggerSlash']);

      if (typeof createChatMessagesFn === 'function' && typeof triggerSlashFn === 'function') {
        await createChatMessagesFn([{ role: 'user', message }], { refresh: 'affected' });
        await triggerSlashFn('/trigger');
      } else if (typeof (globalThis as any).toastr !== 'undefined' && (globalThis as any).toastr?.warning) {
        (globalThis as any).toastr.warning('当前环境未提供发送接口，请确保通过催眠APP脚本打开本界面。');
      }
    } catch (err) {
      console.warn('[HypnoOS] 催眠发送失败', err);
      if (typeof (globalThis as any).toastr !== 'undefined' && (globalThis as any).toastr?.error) {
        (globalThis as any).toastr.error('发送失败：' + (err instanceof Error ? err.message : String(err)));
      }
    }

    // Mock Backend Call
    await DataService.startSession({
      startTime: Date.now(),
      durationMinutes: duration,
      selectedFeatures: enabledFeatures.map(f => ({ id: f.id, note: f.userNote })),
      globalNote,
    });

    // Transition Animation delay
    // 3200ms to allow full completion visual
    setTimeout(() => {
      setIsTransitioning(false);
      setIsActive(true);
      setTimeLeft(duration * 60); // Seconds
    }, 3200);
  };

  const handleStop = () => {
    // 结束前生成一句简述并写入「催眠经历」
    const enabledForLog = features.filter(f => f.isEnabled && f.id !== 'vip1_stats' && canUseEnabledFeature(f));
    const part = enabledForLog.length ? enabledForLog.map(f => f.title).join('、') : '基础';
    const sentence = `${duration}分钟催眠：${part}。${globalNote?.trim() ? `（${globalNote.trim()}）` : ''}`;
    void DataService.appendHypnosisExperience(sentence);

    setIsActive(false);
    setSessionEndVirtualMinutes(null);
    setSessionEndAtMs(null);
    void DataService.clearSessionEnd();
    // Reset inputs
    setFeatures(prev => prev.map(f => (f.id === 'vip1_stats' ? f : { ...f, isEnabled: false, userNote: '' })));
    void DataService.resetFeatures();
    setGlobalNote('');
  };

  // --- Render Helpers ---

  const tierOrder = (t: string) => subscriptionTiers.indexOf(t === 'VIP6' ? 'VIP5' : t);

  const renderTierSection = (tierConfig: (typeof VIP_LEVELS)[0]) => {
    const tierFeatures = features.filter(f => f.tier === tierConfig.tier);
    if (tierFeatures.length === 0) return null;

    const isLocked =
      !debugEnabled &&
      tierConfig.tier !== 'TRIAL' &&
      (!subscription || tierOrder(subscription.tier) < tierOrder(tierConfig.tier));
    const pricePt = 'subscriptionPricePt' in tierConfig ? tierConfig.subscriptionPricePt : 0;

    const formatFeatureCost = (_feature: HypnosisFeature) => '';

    return (
      <div key={tierConfig.tier} className="mb-6 relative">
        <div className="flex justify-between items-center mb-2 px-1">
          <h3 className="text-pink-300 font-bold text-sm tracking-wider uppercase">{tierConfig.label}</h3>
        </div>

        {/* Locked Overlay */}
        {isLocked && (
          <div className="absolute inset-0 z-10 bg-hypno-dark/60 backdrop-blur-sm rounded-xl border border-white/5 flex flex-col items-center justify中心 text-center p-4">
            <Lock className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-300 font-medium">区域未解锁</p>
            <p className="text-xs text-gray-500 mt-1">需要解锁后才能使用该档位</p>
          </div>
        )}

        {/* Features List */}
        <div className={`space-y-3 ${isLocked ? 'opacity-30 pointer-events-none select-none filter blur-[2px]' : ''}`}>
          {tierFeatures.map(feature => {
            const lockedBySubscription = !hasAccessForFeature(feature);
            const lockedByPurchase = Boolean(feature.purchaseRequired) && !feature.isPurchased;
            const canToggle = !isLocked && !lockedBySubscription && !lockedByPurchase;
            const purchasePricePoints = feature.purchasePricePoints ?? 0;

            return (
              <div
                key={feature.id}
                className={`
                 bg-white/5 border rounded-xl overflow-hidden transition-all duration-300
                 ${lockedBySubscription || lockedByPurchase ? 'opacity-80' : ''}
                 ${
                   feature.isEnabled && !lockedBySubscription && !lockedByPurchase
                     ? 'border-pink-500/50 bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.1)]'
                     : 'border-white/10'
                 }
               `}
              >
                <div
                  className={[
                    'p-3 flex justify-between items-center active:bg-white/5',
                    canToggle || lockedByPurchase ? 'cursor-pointer hover:bg-white/5' : 'cursor-not-allowed',
                  ].join(' ')}
                  onClick={() => {
                    if (isLocked) return;
                    if (lockedByPurchase) {
                      triggerPurchaseShake(feature.id);
                      return;
                    }
                    if (lockedBySubscription) {
                      return;
                    }
                    toggleFeature(feature.id);
                  }}
                >
                  <div>
                    <div className="font-medium text-gray-100 flex items-center gap-2">
                      <span>{feature.title}</span>
                      {!isLocked && lockedByPurchase && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-gray-200 flex items-center gap-1">
                          <Lock size={10} className="text-gray-300" /> 未购买
                        </span>
                      )}
                      {!isLocked && lockedBySubscription && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-gray-200 flex items-center gap-1">
                          <Lock size={10} className="text-gray-300" /> 未购买
                        </span>
                      )}
                      {!lockedByPurchase && feature.purchaseRequired && feature.isPurchased && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-200">
                          已购买
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{formatFeatureCost(feature)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {lockedByPurchase && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          void purchaseFeature(feature);
                        }}
                        disabled={false}
                        data-hypno-purchase={feature.id}
                        className={[
                          'text-[10px] px-3 py-1.5 rounded-xl font-extrabold tracking-wide select-none',
                          'border border-amber-200/20 text-black',
                          'bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300',
                          'shadow-[0_6px_18px_rgba(245,158,11,0.22)]',
                          'transition-transform transition-shadow duration-150',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70',
                          'hover:shadow-[0_10px_26px_rgba(245,158,11,0.35)] active:scale-[0.97] cursor-pointer',
                          purchaseShakeFeatureId === feature.id ? 'hypno-shake' : '',
                        ].join(' ')}
                      >
                        购买
                      </button>
                    )}
                    <div
                      className={`
                        w-10 h-6 rounded-full relative transition-colors duration-200
                        ${feature.isEnabled && !lockedBySubscription && !lockedByPurchase ? 'bg-pink-500' : 'bg-gray-700'}
                      `}
                    >
                      <div
                        className={`
                          absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 shadow-sm
                          ${feature.isEnabled && !lockedBySubscription && !lockedByPurchase ? 'left-5' : 'left-1'}
                        `}
                      ></div>
                    </div>
                  </div>
                </div>

                {feature.isEnabled && !lockedBySubscription && !lockedByPurchase && (
                  <div className="px-3 pb-3 pt-0 border-t border-white/5 animate-slide-down">
                    <p className="text-xs text-gray-300 mt-2 leading-relaxed opacity-90">{feature.description}</p>

                    {(() => {
                      const cfg = getFeatureNumericConfig(feature);
                      if (!cfg) return null;
                      const currentRaw = feature.userNumber;
                      const current = typeof currentRaw === 'number' && Number.isFinite(currentRaw) ? currentRaw : '';
                      return (
                        <div className="mt-3">
                          <label>
                            <div className="text-[10px] text-gray-400 mb-1 flex items-center justify-between gap-2">
                              <span className="truncate">
                                {cfg.label}
                                {cfg.unit ? `（${cfg.unit}）` : ''}
                              </span>
                              {cfg.hint && <span className="text-[10px] text-gray-500 truncate">{cfg.hint}</span>}
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
                                  updateFeatureNumber(feature.id, null);
                                  return;
                                }
                                const next = Number(raw);
                                if (!Number.isFinite(next)) return;
                                const clamped = Math.max(cfg.min, Math.min(cfg.max, Math.floor(next)));
                                updateFeatureNumber(feature.id, clamped);
                              }}
                              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 transition-colors"
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
                        onChange={e => updateFeatureNote(feature.id, e.target.value)}
                        className="w-full mt-3 bg-black/30 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 transition-colors resize-none h-16"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- Views ---

  if (isActive) {
    return (
      <ActiveSessionView
        timeLeft={timeLeft}
        sessionEndVirtualMinutes={sessionEndVirtualMinutes}
        sessionEndAtMs={sessionEndAtMs}
        onStop={handleStop}
      />
    );
  }

  if (isTransitioning) {
    const target = typeof document !== 'undefined' ? document.body : null;
    if (!target) return <HypnosisTransitionView />;
    return createPortal(<HypnosisTransitionView />, target);
  }

  // --- Main Dashboard View ---
  return (
    <div
      ref={containerRef}
      className={`
      h-full flex flex-col bg-hypno-dark relative overflow-hidden font-sans
      ${isClosing ? 'animate-fade-out-down' : 'animate-slide-up'}
    `}
    >
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] bg-purple-900/20 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] bg-pink-900/20 rounded-full blur-[80px] pointer-events-none"></div>

      {/* --- Re-designed HUD (Command Center) --- */}
      <div className="relative z-30 flex flex-col bg-gray-900/80 backdrop-blur-xl border-b border-white/10 shadow-lg rounded-b-2xl transition-all duration-300">
        <div ref={commandCenterBaseRef}>
          {/* Top Bar Area */}
          <div
            className="px-4 pt-3 pb-1 flex justify-between items-center cursor-pointer select-none"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {/* Left: Back/Exit */}
            <button
              onClick={e => {
                e.stopPropagation();
                handleExitApp();
              }}
              className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors rounded-full active:bg-white/10"
            >
              <ArrowLeft size={22} />
            </button>

            {/* Center: Title & 会员 */}
            <div className="flex-1 mx-4 flex flex-col justify-center">
              <div className="mt-1 flex items-center justify-between text-[9px] text-gray-500">
                <span className="truncate">会员: {remainingSubscriptionText}</span>
              </div>
            </div>

            {/* Right: Points 区域已废弃，预留空位 */}
            <div className="flex flex-col items-end min-w-[50px]"></div>
          </div>

          {/* Dropdown Handle Indicator */}
          <div
            className="w-full flex justify-center pb-1 cursor-pointer hover:bg-white/5 transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp size={14} className="text-gray-500" />
            ) : (
              <ChevronDown size={14} className="text-gray-500 animate-pulse" />
            )}
          </div>
        </div>

        {/* Expanded Command Center (Stats + Store) */}
        <div
          className={`no-scrollbar transition-[max-height,opacity] duration-300 ease-in-out ${isExpanded ? 'opacity-100 overflow-y-auto pointer-events-auto' : 'opacity-0 overflow-hidden pointer-events-none'}`}
          style={{ maxHeight: isExpanded ? `${commandCenterMaxHeightPx}px` : '0px' }}
        >
          <div className="px-4 pb-4 pt-2">
            {/* Secondary Stats */}
            {/* 可疑度系统已移除，此处布局留空或可放其他信息 */}

            {/* Subscription Area */}
            <div className="mt-4 space-y-2">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Lock size={10} /> 会员购买
              </div>

              <div className="p-3 rounded-xl border border-white/10 bg-black/20">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-300">当前会员</div>
                  <div className="text-xs font-bold text-gray-100">{remainingSubscriptionText}</div>
                </div>
                {subscriptionNotice && <div className="mt-2 text-[10px] text-pink-300">{subscriptionNotice}</div>}
              </div>

              <div className="grid grid-cols-1 gap-2">
                {(['VIP1', 'VIP2', 'VIP3', 'VIP4', 'VIP5'] as const).map(tier => {
                  const price = SUBSCRIPTION_PRICES[tier];
                  const lockedByUnlock = !canSubscribeTier(tier);
                  const isCurrent = subscription?.tier === tier;
                  const label = isCurrent ? '已购买' : '购买';
                  return (
                    <button
                      key={tier}
                      onClick={() => void subscribeTier(tier)}
                      disabled={debugEnabled || lockedByUnlock || isCurrent}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="flex flex-col items-start">
                        <div className="text-xs font-bold text-gray-100">{tier}</div>
                        <div className="text-[10px] text-gray-400">
                          {lockedByUnlock ? '尚未满足解锁条件' : isCurrent ? '已永久解锁' : '点击解锁'}
                        </div>
                      </div>
                      <div className="text-[10px] font-bold text-yellow-300">{lockedByUnlock ? '未解锁' : label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Main Content (Scrollable) --- */}
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">{VIP_LEVELS.map(tier => renderTierSection(tier))}</div>

      {/* --- Footer Controls --- */}
      <div
        ref={footerControlsRef}
        className="bg-gray-900/95 backdrop-blur-xl border-t border-white/10 p-4 pb-8 rounded-t-2xl shadow-[0_-5px_30px_rgba(0,0,0,0.6)] animate-slide-up shrink-0"
      >
        {/* Global Note */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="可以输入你要催眠谁, 怎么催眠或者其他备注"
            value={globalNote}
            onChange={e => setGlobalNote(e.target.value)}
            className="w-full bg-black/40 border-b border-white/20 px-2 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-4">
          {/* Duration Picker */}
          <div className="flex items-center bg-gray-800 rounded-lg px-3 py-2 border border-white/5">
            <Clock size={16} className="text-pink-400 mr-2" />
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

          {/* Start Button */}
          <button
            onClick={handleStart}
            disabled={!hasSessionFeaturesEnabled}
            className={`
                 flex-1 py-3 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all
                 ${
                   hasSessionFeaturesEnabled
                     ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-pink-500/25 active:scale-95'
                     : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                 }
               `}
          >
            <Zap size={18} fill="currentColor" />
            启动催眠
          </button>
        </div>
      </div>
    </div>
  );
};
