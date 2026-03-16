// Enum for application state (which app is open)
export enum AppMode {
  HOME = 'HOME',
  HYPNOSIS = 'HYPNOSIS',
  NTR_HYPNOSIS = 'NTR_HYPNOSIS',
  BODY_STATS = 'BODY_STATS',
  HELP = 'HELP',
  ACHIEVEMENTS = 'ACHIEVEMENTS', // Replaces Ghost/WIP
  CHARACTER_REGISTRY = 'CHARACTER_REGISTRY',
  WIP = 'WIP',
  CUSTOM_QUEST = 'CUSTOM_QUEST',
  SHOP = 'SHOP',
}

// User Resources Data Structure（已不再使用点数系统）
export interface UserResources {}

// Hypnosis Feature Definition
export interface HypnosisFeature {
  id: string;
  title: string;
  description: string; // Detail shown when expanded
  tier: 'TRIAL' | 'VIP1' | 'VIP2' | 'VIP3' | 'VIP4' | 'VIP5' | 'VIP6';
  costType: 'PER_MINUTE' | 'ONE_TIME';
  costValue: number;
  costCurrency?: 'MC_ENERGY' | 'PT_POINTS';
  notePlaceholder?: string;
  userNote?: string; // User input
  userNumber?: number; // Numeric input for some features
  isEnabled: boolean; // Toggle state
  purchaseRequired?: boolean; // Must be permanently purchased to use
  purchasePricePoints?: number; // 已不再使用点数系统
  isPurchased?: boolean; // Permanently purchased (or free to use)
}

// Achievement Data Structure
export interface Achievement {
  id: string;
  title: string;
  description: string;
  rewardPtPoints: number;
  isClaimed: boolean;
  // Function to check if unlocked based on current user stats
  // Returns true if the condition is met
  checkCondition: (user: UserResources) => boolean;
}

// Quest Data Structure
export type QuestStatus = 'AVAILABLE' | 'ACTIVE' | 'COMPLETED' | 'CLAIMED';

export interface Quest {
  id: string;
  title: string;
  description: string;
  rewardPtPoints: number;
  status: QuestStatus;
}

// Data payload for backend submission
export interface SessionStartPayload {
  startTime: number;
  durationMinutes: number;
  selectedFeatures: {
    id: string;
    note?: string;
  }[];
  globalNote: string;
}

// VIP Tier Config（不再进行点数结算，仅作为显示配置）
export interface VipTierConfig {
  tier: string;
  subscriptionPricePt: number;
  label: string;
}

export const VIP_LEVELS: VipTierConfig[] = [
  { tier: 'TRIAL', subscriptionPricePt: 0, label: '试用区' },
  { tier: 'VIP1', subscriptionPricePt: 150, label: 'VIP 1 (基础)' },
  { tier: 'VIP2', subscriptionPricePt: 300, label: 'VIP 2 (进阶)' },
  { tier: 'VIP3', subscriptionPricePt: 500, label: 'VIP 3 (高阶)' },
  { tier: 'VIP4', subscriptionPricePt: 1000, label: 'VIP 4 (深度)' },
  { tier: 'VIP5', subscriptionPricePt: 2000, label: 'VIP 5 (永久)' },
  { tier: 'VIP6', subscriptionPricePt: 2000, label: 'VIP 6 (完全控制)' },
];
