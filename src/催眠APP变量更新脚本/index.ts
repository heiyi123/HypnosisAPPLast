// 催眠APP 变量更新脚本：监听 MVU 变量更新，执行每日结算（能量恢复、警戒度/可疑度等）
// 与「催眠APP脚本」分离：本脚本不提供打开前端的按钮，仅负责变量逻辑。
/// <reference path="./shims.d.ts" />
import _ from 'lodash';

const UPDATE_REASON = '催眠APP变量更新脚本：每日结算';

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
  const weekdayIndex = normalized ? WEEKDAY_CHARS.indexOf(normalized as (typeof WEEKDAY_CHARS)[number]) : -1;

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

  const setter = (Mvu as unknown as { setMvuVariable?: (mvuData: Mvu.MvuData, variablePath: string, value: unknown, options?: { reason?: string }) => Promise<boolean> })
    .setMvuVariable;

  if (typeof setter === 'function') {
    const ok = await setter(mvu, path, nextValue, { reason });
    if (ok) _.set(mvu.stat_data, path, nextValue);
    return ok;
  }

  _.set(mvu.stat_data, path, nextValue);
  return true;
}

function pickExistingPath(statData: Record<string, unknown>, paths: readonly string[]): string {
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
  if (delta < 0) delta += 365;

  const isSameDay = delta === 0;
  const isDateMissingUpdate = isSameDay && timeCrossed;
  if (!isDateMissingUpdate) return { dayDelta: Math.max(0, Math.floor(delta)), isDateMissingUpdate: false };

  const nextDate = addDays(afterParsed, 1);
  return {
    dayDelta: 1,
    isDateMissingUpdate: true,
    nextDateText: `${nextDate.month}月${nextDate.day}日${nextDate.weekdayIndex !== null ? ' 星期' + WEEKDAY_CHARS[nextDate.weekdayIndex] : ''}`,
  };
}

async function applyDailySettlement(mvu: Mvu.MvuData, before: Mvu.MvuData): Promise<boolean> {
  const statAfter = (mvu.stat_data ?? {}) as Record<string, unknown>;
  const statBefore = (before?.stat_data ?? {}) as Record<string, unknown>;

  const beforeDate = _.get(statBefore, PATHS.date);
  const afterDate = _.get(statAfter, PATHS.date);
  const beforeTime = _.get(statBefore, PATHS.time);
  const afterTime = _.get(statAfter, PATHS.time);

  const hasTime =
    beforeTime != null &&
    afterTime != null &&
    String(beforeTime).trim() !== '' &&
    String(afterTime).trim() !== '';
  const hasDate =
    (beforeDate != null && String(beforeDate).trim() !== '') ||
    (afterDate != null && String(afterDate).trim() !== '');
  if (!hasTime && !hasDate) return false;

  const { dayDelta, isDateMissingUpdate } = resolveDayDelta(beforeDate, afterDate, beforeTime, afterTime);
  if (dayDelta <= 0 && !isDateMissingUpdate) return false;

  let changed = false;

  const energyPath = pickExistingPath(statAfter, PATHS.mcEnergy);
  const energyMaxPath = pickExistingPath(statAfter, PATHS.mcEnergyMax);
  const energy = toFiniteNumber(_.get(statAfter, energyPath), 0) ?? 0;
  const energyMax = toFiniteNumber(_.get(statAfter, energyMaxPath), null);

  if (energyMax !== null) {
    const safeMax = Math.max(0, energyMax);
    const regenPerDay = safeMax * 0.5;
    const nextEnergy = clampNumber(energy + regenPerDay * dayDelta, 0, safeMax);
    if (await setIfChanged(mvu, energyPath, nextEnergy)) changed = true;
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
    for (const [roleName, roleValue] of Object.entries(roles)) {
      if (!roleName) continue;
      if (!_.isPlainObject(roleValue)) continue;
      const alertnessPath = `${PATHS.roles}.${roleName}.警戒度`;
      const alertness = toFiniteNumber(_.get(statAfter, alertnessPath), null);
      if (alertness === null) continue;

      for (let i = 0; i < dayDelta; i += 1) {
        const alertnessAtStart = Math.max(0, (alertness as number) - 10 * i);
        dailySuspicionIncrease += Math.floor(alertnessAtStart / 5);
      }

      const nextAlertness = Math.max(0, (alertness as number) - 10 * dayDelta);
      if (await setIfChanged(mvu, alertnessPath, nextAlertness)) changed = true;
    }
  }

  if (suspicion !== null) {
    const nextSuspicion = Math.max(0, suspicion - 10 * dayDelta + dailySuspicionIncrease);
    if (await setIfChanged(mvu, PATHS.suspicion, nextSuspicion)) changed = true;
  }

  return changed;
}

$(() => {
  (async () => {
    try {
      await waitGlobalInitialized('Mvu');
    } catch (err) {
      console.warn('[催眠APP变量更新脚本] Mvu 未就绪，脚本不生效', err);
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
        console.error('[催眠APP变量更新脚本] 每日结算失败', err);
        isSelfApplying = false;
      }
    });
  })();
});
