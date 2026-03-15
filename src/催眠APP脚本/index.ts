// 催眠APP 脚本：每日结算 + 主界面手机图标（点击打开前端界面）
// 每日结算目标：见下方 applyDailySettlement
// 外挂用法：安装并启用本脚本后，酒馆主界面会出现手机图标，点击即可打开催眠APP前端；未打开角色卡时前端会提示先打开角色卡。
/// <reference path="./shims.d.ts" />
import _ from 'lodash';
import { createScriptIdDiv } from '@/util/script';

const UPDATE_REASON = '催眠APP脚本：每日结算';

/** 与主卡 MVU 隔离的命名空间前缀（外挂模式） */
const MVU_PREFIX = '催眠APP';

const PATHS = {
  system: `${MVU_PREFIX}.系统`,
  roles: `${MVU_PREFIX}.角色`,
  date: `${MVU_PREFIX}.系统.当前日期`,
  time: `${MVU_PREFIX}.系统.当前时间`,
  suspicion: `${MVU_PREFIX}.系统.主角可疑度`,
  mcEnergy: [`${MVU_PREFIX}.系统._MC能量`, `${MVU_PREFIX}.系统.MC能量`],
  mcEnergyMax: [`${MVU_PREFIX}.系统._MC能量上限`, `${MVU_PREFIX}.系统.MC能量上限`],
} as const;

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
const WEEKDAY_CHARS = ['一', '二', '三', '四', '五', '六', '日'] as const;

function toFiniteNumber(val: unknown, fallback: number | null = null): number | null {
  const n = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function clampNumber(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function parseTimeToMinutes(time: unknown): number | null {
  if (typeof time !== 'string') return null;
  const m = /^(\d{1,2})\s*:\s*(\d{1,2})(?:\s*:\s*(\d{1,2}))?$/.exec(time.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

type ParsedDate = {
  month: number;
  day: number;
  weekdayIndex: number | null;
};

function parseDateText(text: unknown): ParsedDate | null {
  if (typeof text !== 'string') return null;
  const s = text.trim();
  const dateMatch = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/.exec(s);
  if (!dateMatch) return null;
  const month = Number(dateMatch[1]);
  const day = Number(dateMatch[2]);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return null;

  const weekdayMatch = /(星期|周)\s*([一二三四五六日天])/.exec(s);
  const weekdayChar = weekdayMatch ? weekdayMatch[2] : null;
  const normalized = weekdayChar === '天' ? '日' : weekdayChar;
  const weekdayIndex = normalized ? WEEKDAY_CHARS.indexOf(normalized as any) : -1;

  return {
    month: clampNumber(month, 1, 12),
    day: clampNumber(day, 1, MONTH_DAYS[clampNumber(month, 1, 12) - 1]),
    weekdayIndex: weekdayIndex >= 0 ? weekdayIndex : null,
  };
}

function toDayOfYear(d: ParsedDate): number {
  const mIndex = clampNumber(d.month, 1, 12) - 1;
  const dIndex = clampNumber(d.day, 1, MONTH_DAYS[mIndex]) - 1;
  const prefix = MONTH_DAYS.slice(0, mIndex).reduce((a, b) => a + b, 0);
  return prefix + dIndex;
}

function addDays(d: ParsedDate, deltaDays: number): ParsedDate {
  let month = clampNumber(d.month, 1, 12);
  let day = clampNumber(d.day, 1, MONTH_DAYS[month - 1]);
  let weekdayIndex = d.weekdayIndex;

  let remaining = Math.max(0, Math.floor(deltaDays));
  while (remaining > 0) {
    day += 1;
    if (day > MONTH_DAYS[month - 1]) {
      day = 1;
      month += 1;
      if (month > 12) month = 1;
    }
    if (weekdayIndex !== null) weekdayIndex = (weekdayIndex + 1) % WEEKDAY_CHARS.length;
    remaining -= 1;
  }

  return { month, day, weekdayIndex };
}

function formatDateText(d: ParsedDate): string {
  if (d.weekdayIndex === null) return `${d.month}月${d.day}日`;
  const weekdayChar = WEEKDAY_CHARS[clampNumber(d.weekdayIndex, 0, WEEKDAY_CHARS.length - 1)];
  return `${d.month}月${d.day}日 星期${weekdayChar}`;
}

function getMessageVariableOption(): VariableOption {
  try {
    return { type: 'message', message_id: getCurrentMessageId() };
  } catch {
    return { type: 'message', message_id: 'latest' };
  }
}

async function setIfChanged(
  mvu: Mvu.MvuData,
  path: string,
  nextValue: unknown,
  reason = UPDATE_REASON,
): Promise<boolean> {
  const prev = _.get(mvu.stat_data, path);
  if (_.isEqual(prev, nextValue)) return false;

  const setter = (Mvu as any).setMvuVariable as
    | ((mvuData: Mvu.MvuData, variablePath: string, value: unknown, options?: { reason?: string }) => Promise<boolean>)
    | undefined;

  if (typeof setter === 'function') {
    const ok = await setter(mvu, path, nextValue, { reason });
    if (ok) _.set(mvu.stat_data, path, nextValue);
    return ok;
  }

  _.set(mvu.stat_data, path, nextValue);
  return true;
}

function pickExistingPath(statData: Record<string, any>, paths: readonly string[]): string {
  for (const p of paths) {
    if (_.has(statData, p)) return p;
  }
  return paths[0];
}

function resolveDayDelta(
  beforeDate: unknown,
  afterDate: unknown,
  beforeTime: unknown,
  afterTime: unknown,
): { dayDelta: number; isDateMissingUpdate: boolean; nextDateText?: string } {
  const beforeParsed = parseDateText(beforeDate);
  const afterParsed = parseDateText(afterDate);
  const beforeMinutes = parseTimeToMinutes(beforeTime);
  const afterMinutes = parseTimeToMinutes(afterTime);
  const timeCrossed = beforeMinutes !== null && afterMinutes !== null && afterMinutes < beforeMinutes;

  if (!beforeParsed || !afterParsed) {
    const unchanged = typeof beforeDate === 'string' && typeof afterDate === 'string' && beforeDate === afterDate;
    const isDateMissingUpdate = unchanged && timeCrossed;
    return { dayDelta: isDateMissingUpdate ? 1 : 0, isDateMissingUpdate };
  }

  const beforeDay = toDayOfYear(beforeParsed);
  const afterDay = toDayOfYear(afterParsed);
  let delta = afterDay - beforeDay;
  if (delta < 0) delta += 365; // 允许跨年（简单按 365 天处理）

  const isSameDay = delta === 0;
  const isDateMissingUpdate = isSameDay && timeCrossed;
  if (!isDateMissingUpdate) return { dayDelta: Math.max(0, Math.floor(delta)), isDateMissingUpdate: false };

  const nextDate = addDays(afterParsed, 1);
  return { dayDelta: 1, isDateMissingUpdate: true, nextDateText: formatDateText(nextDate) };
}

async function applyDailySettlement(mvu: Mvu.MvuData, before: Mvu.MvuData): Promise<boolean> {
  const statAfter = mvu.stat_data ?? {};
  const statBefore = before?.stat_data ?? {};

  const beforeDate = _.get(statBefore, PATHS.date);
  const afterDate = _.get(statAfter, PATHS.date);
  const beforeTime = _.get(statBefore, PATHS.time);
  const afterTime = _.get(statAfter, PATHS.time);

  // 本世界书已不再维护日期/时间；若主卡也未提供，则不做每日结算，便于外挂随时开关
  const hasTime = beforeTime != null && afterTime != null && String(beforeTime).trim() !== '' && String(afterTime).trim() !== '';
  const hasDate = (beforeDate != null && String(beforeDate).trim() !== '') || (afterDate != null && String(afterDate).trim() !== '');
  if (!hasTime && !hasDate) return false;

  const { dayDelta, isDateMissingUpdate } = resolveDayDelta(beforeDate, afterDate, beforeTime, afterTime);
  if (dayDelta <= 0 && !isDateMissingUpdate) return false;

  let changed = false;

  // 不写入当前日期，由主角色卡管理，便于世界书随时开启/关闭
  // if (isDateMissingUpdate && typeof nextDateText === 'string') {
  //   if (await setIfChanged(mvu, PATHS.date, nextDateText)) changed = true;
  // }

  const energyPath = pickExistingPath(statAfter, PATHS.mcEnergy);
  const energyMaxPath = pickExistingPath(statAfter, PATHS.mcEnergyMax);
  const energy = toFiniteNumber(_.get(statAfter, energyPath), 0) ?? 0;
  const energyMax = toFiniteNumber(_.get(statAfter, energyMaxPath), null);

  if (energyMax !== null) {
    const safeMax = Math.max(0, energyMax);
    const regenPerDay = safeMax * 0.5;
    const nextEnergy = clampNumber(energy + regenPerDay * dayDelta, 0, safeMax);
    if (await setIfChanged(mvu, energyPath, nextEnergy)) changed = true;
    // 若别名字段也存在，保持一致
    for (const aliasPath of [...PATHS.mcEnergy, ...PATHS.mcEnergyMax]) {
      if (!_.has(statAfter, aliasPath)) continue;
      if (aliasPath === energyPath || aliasPath === energyMaxPath) continue;
      const aliasValue = aliasPath.includes('能量上限') ? safeMax : nextEnergy;
      if (await setIfChanged(mvu, aliasPath, aliasValue)) changed = true;
    }
  }

  const suspicion = toFiniteNumber(_.get(statAfter, PATHS.suspicion), null);
  const roles = _.get(statAfter, PATHS.roles);
  let dailySuspicionIncrease = 0;
  if (_.isPlainObject(roles)) {
    for (const [roleName, roleValue] of Object.entries<any>(roles)) {
      if (!roleName) continue;
      if (!_.isPlainObject(roleValue)) continue;
      const alertnessPath = `${PATHS.roles}.${roleName}.警戒度`;
      const alertness = toFiniteNumber(_.get(statAfter, alertnessPath), null);
      if (alertness === null) continue;

      // 警戒度影响可疑度：每 5 点警戒度每天 +1 可疑度（按天结算，警戒度每天还会自然下降）
      for (let i = 0; i < dayDelta; i += 1) {
        const alertnessAtStart = Math.max(0, alertness - 10 * i);
        dailySuspicionIncrease += Math.floor(alertnessAtStart / 5);
      }

      const nextAlertness = Math.max(0, alertness - 10 * dayDelta);
      if (await setIfChanged(mvu, alertnessPath, nextAlertness)) changed = true;

      // 堕落值由主角色卡管理，不在此结算（世界书外挂不干扰主卡玩法）
    }
  }

  if (suspicion !== null) {
    const nextSuspicion = Math.max(0, suspicion - 10 * dayDelta + dailySuspicionIncrease);
    if (await setIfChanged(mvu, PATHS.suspicion, nextSuspicion)) changed = true;
  }

  return changed;
}

/** 前端界面 URL：与脚本同源时自动推导（脚本在 .../催眠APP脚本/index.js，前端在 .../催眠APP前端/index.html），否则需在脚本变量中设置 催眠APP前端URL */
function getHypnosisAppFrontendUrl(): string {
  try {
    const vars = getVariables({ type: 'script', script_id: getScriptId() }) as Record<string, unknown> | undefined;
    const url = typeof vars?.催眠APP前端URL === 'string' ? vars.催眠APP前端URL.trim() : '';
    if (url) return url;
  } catch {
    // ignore
  }
  try {
    const scriptEl = document.currentScript as HTMLScriptElement | null;
    const src = scriptEl?.src ?? '';
    if (src) {
      const base = src.replace(/\/[^/]*$/, '');
      return `${base.replace(/\/催眠APP脚本\/?$/, '')}/催眠APP前端/index.html`;
    }
  } catch {
    // ignore
  }
  return '';
}

$(() => {
  const frontendUrl = getHypnosisAppFrontendUrl();
  const $container = createScriptIdDiv();
  $container.css({ position: 'fixed', bottom: '16px', right: '16px', zIndex: 99998, pointerEvents: 'none' });
  $container.find('*').css('pointerEvents', 'auto');
  const $btn = $('<button>')
    .attr({ type: 'button', title: '打开催眠APP' })
    .css({
      width: '44px',
      height: '44px',
      borderRadius: '12px',
      border: 'none',
      background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
      color: '#fff',
      cursor: 'pointer',
      boxShadow: '0 4px 14px rgba(124,58,237,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
    })
    .html(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
    )
    .on('click', () => {
      if (!frontendUrl) {
        toastr?.warning?.('未配置前端地址：请在脚本变量中设置 催眠APP前端URL，或确保脚本与前端同源部署');
        return;
      }
      const overlayId = `hypnosis_app_overlay_${getScriptId()}`;
      if ($(`#${overlayId}`).length) {
        $(`#${overlayId}`).remove();
        return;
      }
      const $overlay = $('<div>')
        .attr('id', overlayId)
        .css({
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          boxSizing: 'border-box',
        })
        .on('click', e => {
          if (e.target === e.currentTarget) $overlay.remove();
        });
      const $frameWrap = $('<div>')
        .css({
          width: '100%',
          maxWidth: '420px',
          height: '90%',
          maxHeight: '800px',
          borderRadius: '16px',
          overflow: 'hidden',
          background: '#0f0f0f',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          position: 'relative',
        })
        .on('click', e => e.stopPropagation());
      const $close = $('<button>')
        .attr({ type: 'button', title: '关闭' })
        .css({
          position: 'absolute',
          top: '8px',
          right: '8px',
          zIndex: 10,
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          border: 'none',
          background: 'rgba(255,255,255,0.15)',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '18px',
          lineHeight: 1,
        })
        .text('×')
        .on('click', () => $overlay.remove());
      const $iframe = $('<iframe>')
        .attr({ src: frontendUrl, title: '催眠APP' })
        .css({ width: '100%', height: '100%', border: 'none', display: 'block', minHeight: '500px' });
      $frameWrap.append($close).append($iframe);
      $overlay.append($frameWrap);
      $('body').append($overlay);
    });
  $container.append($btn);
  $('body').append($container);

  (async () => {
    try {
      await waitGlobalInitialized('Mvu');
    } catch (err) {
      console.warn('[催眠APP脚本] Mvu 未就绪，脚本不生效', err);
      return;
    }

    let isSelfApplying = false;

    eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, async (after: Mvu.MvuData, before: Mvu.MvuData) => {
      if (isSelfApplying) {
        isSelfApplying = false;
        return;
      }

      try {
        const changed = await applyDailySettlement(after, before);
        if (!changed) return;

        isSelfApplying = true;
        await Mvu.replaceMvuData(after, getMessageVariableOption());
      } catch (err) {
        console.error('[催眠APP脚本] 每日结算失败', err);
        isSelfApplying = false;
      }
    });
  })();
});
