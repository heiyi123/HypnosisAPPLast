import type { HypnosisFeature } from '../types';
import { VIP_LEVELS } from '../types';

export const SUBSCRIPTION_TIERS = ['VIP1', 'VIP2', 'VIP3', 'VIP4', 'VIP5'] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

/** 购买制：仅记录已购买的档位，永久有效。 */
export type SubscriptionState = {
  tier: SubscriptionTier;
  /** 兼容旧类型；购买制下不用于判断是否有效 */
  endVirtualMinutes?: number;
  autoRenew?: boolean;
};

export type AccessContext = {
  debugEnabled: boolean;
  subscription: SubscriptionState | null;
  nowVirtualMinutes: number | null;
};

function toFiniteNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** 解锁该档位所需条件（已不再依赖点数，仅做占位） */
export function getSubscriptionPricePt(_tier: SubscriptionTier): number {
  return 0;
}

export const getSubscriptionUnlockThreshold = getSubscriptionPricePt;

export function canSubscribeTier(ctx: {
  tier: SubscriptionTier;
  debugEnabled: boolean;
  ptPoints: number;
}): boolean {
  void ctx;
  return true;
}

/** 购买制：只要存在已购买档位即视为有效，永久解锁。 */
export function isSubscriptionActive(ctx: AccessContext): boolean {
  if (ctx.debugEnabled) return true;
  return ctx.subscription != null && ctx.subscription.tier != null;
}

function featureRequiredSubscriptionTier(feature: HypnosisFeature): SubscriptionTier | null {
  if (feature.tier === 'TRIAL') return null;
  if (SUBSCRIPTION_TIERS.includes(feature.tier as SubscriptionTier)) return feature.tier as SubscriptionTier;

  // Feature tiers above VIP5 still require the highest subscription tier.
  return 'VIP5';
}

export function canUseFeature(feature: HypnosisFeature, ctx: AccessContext): boolean {
  if (ctx.debugEnabled) return true;

  const required = featureRequiredSubscriptionTier(feature);
  if (required === null) return true;

  if (!isSubscriptionActive(ctx) || !ctx.subscription) return false;
  return SUBSCRIPTION_TIERS.indexOf(ctx.subscription.tier) >= SUBSCRIPTION_TIERS.indexOf(required);
}

export function getBodyStatsUnlocked(opts: { debugEnabled: boolean; vip1StatsUnlocked: boolean }): boolean {
  return opts.debugEnabled || opts.vip1StatsUnlocked;
}
