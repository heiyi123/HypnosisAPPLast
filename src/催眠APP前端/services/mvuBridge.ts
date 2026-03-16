import _ from 'lodash';
import type { UserResources } from '../types';

const UPDATE_REASON = '催眠APP前端';

/** 与主卡 MVU 隔离的命名空间前缀（外挂模式） */
const MVU_PREFIX = '催眠APP';
const THIS_TURN_APP_OPERATION_LOG_PATH = `${MVU_PREFIX}.本轮APP操作`;
const DEFAULT_APP_OPERATION_LOG_VALUE = '无';

let writeQueue: Promise<unknown> = Promise.resolve();

function enqueueMvuWrite<T>(task: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(task, task);
  writeQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

type WaitOptions = {
  timeoutMs?: number;
  pollMs?: number;
};

function isMvuDefined() {
  return typeof (globalThis as any).Mvu !== 'undefined';
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => reject(new Error(`${label} timeout after ${timeoutMs}ms`)), timeoutMs);
    promise.then(
      value => {
        globalThis.clearTimeout(timer);
        resolve(value);
      },
      err => {
        globalThis.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function safeWaitGlobalInitialized(name: string, timeoutMs: number): Promise<void> {
  const maybeWait = (globalThis as any).waitGlobalInitialized as ((key: string) => Promise<unknown>) | undefined;
  if (typeof maybeWait !== 'function') return;
  await withTimeout(Promise.resolve(maybeWait(name)), timeoutMs, `waitGlobalInitialized(${name})`);
}

export async function waitForMvuReady(options: WaitOptions = {}): Promise<boolean> {
  const timeoutMs = options.timeoutMs ?? 2500;
  const pollMs = options.pollMs ?? 100;

  if (isMvuDefined()) return true;

  const maybeWait = (globalThis as any).waitGlobalInitialized as ((key: string) => Promise<unknown>) | undefined;
  if (typeof maybeWait !== 'function') return false;

  const deadline = Date.now() + Math.max(0, timeoutMs);
  while (Date.now() < deadline) {
    try {
      await safeWaitGlobalInitialized('Mvu', Math.min(pollMs, Math.max(0, deadline - Date.now())));
    } catch {
      // ignore
    }

    if (isMvuDefined()) return true;
    await new Promise<void>(resolve => globalThis.setTimeout(resolve, pollMs));
  }

  return isMvuDefined();
}

function getMessageVariableOption(): VariableOption {
  try {
    return { type: 'message', message_id: getCurrentMessageId() };
  } catch {
    return { type: 'message', message_id: 'latest' };
  }
}

async function getMvuData(): Promise<{ mvu: Mvu.MvuData; option: VariableOption } | null> {
  try {
    const ready = await waitForMvuReady();
    if (!ready) return null;
    const option = getMessageVariableOption();
    return { mvu: Mvu.getMvuData(option), option };
  } catch (err) {
    console.warn('[HypnoOS] Mvu 未就绪，跳过变量同步', err);
    return null;
  }
}

async function setIfChanged(mvu: Mvu.MvuData, path: string, nextValue: unknown, reason = UPDATE_REASON) {
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

function normalizeAppOperationLogValue(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_APP_OPERATION_LOG_VALUE;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_APP_OPERATION_LOG_VALUE;
}

export const MvuBridge = {
  getStatData: async (): Promise<Record<string, any> | null> => {
    const data = await getMvuData();
    if (!data) return null;
    return (data.mvu.stat_data ?? null) as any;
  },

  getSystem: async (): Promise<Record<string, any> | null> => {
    const data = await getMvuData();
    if (!data) return null;
    return (_.get(data.mvu, `stat_data.${MVU_PREFIX}.系统`) ?? null) as any;
  },

  getRoles: async (): Promise<Record<string, any> | null> => {
    const data = await getMvuData();
    if (!data) return null;
    const roles = _.get(data.mvu, `stat_data.${MVU_PREFIX}.角色`);
    return _.isPlainObject(roles) ? (roles as any) : null;
  },

  getTasks: async (): Promise<Record<string, any> | null> => {
    const data = await getMvuData();
    if (!data) return null;
    const tasks = _.get(data.mvu, `stat_data.${MVU_PREFIX}.任务`);
    return _.isPlainObject(tasks) ? (tasks as any) : null;
  },

  purchaseItem: async (itemName: string, description: string, count: number = 1) => {
    return enqueueMvuWrite(async () => {
      const data = await getMvuData();
      if (!data) return false;
      const { mvu, option } = data;

      const path = `${MVU_PREFIX}.系统.持有物品`;
      const raw = _.get(mvu.stat_data, path);
      const current = _.isPlainObject(raw) ? (raw as Record<string, any>) : {};

      const prevEntry = (current[itemName] && typeof current[itemName] === 'object'
        ? (current[itemName] as Record<string, any>)
        : {}) as { 描述?: string; 数量?: number };

      const nextCount = Math.max(0, (typeof prevEntry.数量 === 'number' ? prevEntry.数量 : 0) + Math.max(1, count));
      const nextEntry = {
        描述: prevEntry.描述 || description,
        数量: nextCount,
      };

      const nextItems = { ...current, [itemName]: nextEntry };
      _.set(mvu.stat_data, path, nextItems);
      await Mvu.replaceMvuData(mvu, option);
      return true;
    });
  },

  syncUserResources: async (_user: UserResources) => {
    return enqueueMvuWrite(async () => {
      const data = await getMvuData();
      if (!data) return;

      // 点数系统已移除，这里不再写入资源，仅保持接口存在以兼容调用。
      void data;
    });
  },

  setTask: async (taskName: string, payload: { 完成条件: string; 已完成: boolean }) => {
    return enqueueMvuWrite(async () => {
      const data = await getMvuData();
      if (!data) return false;
      const { mvu, option } = data;
      const path = `${MVU_PREFIX}.任务.${taskName}`;
      const prev = _.get(mvu.stat_data, path);
      if (_.isEqual(prev, payload)) return false;
      _.set(mvu.stat_data, path, payload);
      await Mvu.replaceMvuData(mvu, option);
      return true;
    });
  },

  deleteTask: async (taskName: string) => {
    return enqueueMvuWrite(async () => {
      const data = await getMvuData();
      if (!data) return false;
      const { mvu, option } = data;

      const path = `${MVU_PREFIX}.任务.${taskName}`;
      const prev = _.get(mvu.stat_data, path);
      if (typeof prev === 'undefined') return false;

      _.unset(mvu.stat_data, path);
      await Mvu.replaceMvuData(mvu, option);
      return true;
    });
  },

  syncPersistedStore: async (store: unknown) => {
    return enqueueMvuWrite(async () => {
      const data = await getMvuData();
      if (!data) return;

      const { mvu, option } = data;
      const changed = await setIfChanged(mvu, `${MVU_PREFIX}.系统._hypnoos`, store);
      if (changed) {
        await Mvu.replaceMvuData(mvu, option);
      }
    });
  },

  syncSubscriptionTier: async (_tierLabel: string) => {
    // 订阅等级变量已移除，此处保留空实现以兼容旧调用。
    return;
  },

  resetThisTurnAppOperationLog: async () => {
    return enqueueMvuWrite(async () => {
      try {
        const data = await getMvuData();
        if (!data) return false;

        const { mvu, option } = data;
        const changed = await setIfChanged(mvu, THIS_TURN_APP_OPERATION_LOG_PATH, DEFAULT_APP_OPERATION_LOG_VALUE);
        if (changed) {
          await Mvu.replaceMvuData(mvu, option);
        }
        return changed;
      } catch (err) {
        console.warn('[HypnoOS] 本轮APP操作重置失败', err);
        return false;
      }
    });
  },

  appendThisTurnAppOperationLog: async (entry: string) => {
    return enqueueMvuWrite(async () => {
      try {
        const normalizedEntry = typeof entry === 'string' ? entry.trim() : '';
        if (!normalizedEntry) return false;

        const data = await getMvuData();
        if (!data) return false;

        const { mvu, option } = data;
        const prev = normalizeAppOperationLogValue(_.get(mvu.stat_data, THIS_TURN_APP_OPERATION_LOG_PATH));
        const base = prev === DEFAULT_APP_OPERATION_LOG_VALUE ? '' : prev;
        const nextValue = base ? `${base}\n${normalizedEntry}` : normalizedEntry;
        const changed = await setIfChanged(mvu, THIS_TURN_APP_OPERATION_LOG_PATH, nextValue);
        if (changed) {
          await Mvu.replaceMvuData(mvu, option);
        }
        return changed;
      } catch (err) {
        console.warn('[HypnoOS] 本轮APP操作写入失败', err);
        return false;
      }
    });
  },

  createRoleIfMissing: async (roleName: string, initialData: Record<string, any>) => {
    return enqueueMvuWrite(async () => {
      const data = await getMvuData();
      if (!data) return false;
      const { mvu, option } = data;
      const roles = (_.get(mvu.stat_data, `${MVU_PREFIX}.角色`) as Record<string, any>) ?? {};
      if (Object.prototype.hasOwnProperty.call(roles, roleName)) {
        return false;
      }
      _.set(mvu.stat_data, `${MVU_PREFIX}.角色.${roleName}`, initialData);
      await Mvu.replaceMvuData(mvu, option);
      return true;
    });
  },
};
