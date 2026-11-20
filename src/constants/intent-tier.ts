export const INTENT_TIERS = ['low', 'medium', 'high'] as const;

export type IntentTier = (typeof INTENT_TIERS)[number];

export const INTENT_TIER_OPTIONS = [
  { value: 'LOW', label: 'Low', position: 0, color: 'gray' as const },
  { value: 'MEDIUM', label: 'Medium', position: 1, color: 'orange' as const },
  { value: 'HIGH', label: 'High', position: 2, color: 'green' as const },
];

export const isIntentTier = (value: unknown): value is IntentTier =>
  typeof value === 'string' &&
  (INTENT_TIERS as readonly string[]).includes(value);

export type IntentTierOption = Uppercase<IntentTier>;

export const toIntentTierOption = (
  tier: IntentTier | null,
): IntentTierOption | null =>
  tier === null ? null : (tier.toUpperCase() as IntentTierOption);

export const isAtOrAboveThreshold = (
  tier: IntentTier | null,
  threshold: IntentTier,
) =>
  tier !== null && INTENT_TIERS.indexOf(tier) >= INTENT_TIERS.indexOf(threshold);
