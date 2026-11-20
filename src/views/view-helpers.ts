import { ViewFilterOperand } from 'twenty-sdk/define';

export const column = (
  universalIdentifier: string,
  fieldMetadataUniversalIdentifier: string,
  position: number,
  size: number,
) => ({
  universalIdentifier,
  fieldMetadataUniversalIdentifier,
  position,
  isVisible: true,
  size,
});

// Twenty's PAST_n_DAY window ends where today starts, so "last n days" is
// PAST_(n-1)_DAY or THIS_1_DAY, both placed in an OR filter group.
export const withinLastDaysFilters = ({
  days,
  dateFieldUniversalIdentifier,
  groupUniversalIdentifier,
  pastFilterUniversalIdentifier,
  todayFilterUniversalIdentifier,
}: {
  days: number;
  dateFieldUniversalIdentifier: string;
  groupUniversalIdentifier: string;
  pastFilterUniversalIdentifier: string;
  todayFilterUniversalIdentifier: string;
}) => [
  {
    universalIdentifier: pastFilterUniversalIdentifier,
    fieldMetadataUniversalIdentifier: dateFieldUniversalIdentifier,
    operand: ViewFilterOperand.IS_RELATIVE,
    value: `PAST_${days - 1}_DAY`,
    viewFilterGroupUniversalIdentifier: groupUniversalIdentifier,
    positionInViewFilterGroup: 0,
  },
  {
    universalIdentifier: todayFilterUniversalIdentifier,
    fieldMetadataUniversalIdentifier: dateFieldUniversalIdentifier,
    operand: ViewFilterOperand.IS_RELATIVE,
    value: 'THIS_1_DAY',
    viewFilterGroupUniversalIdentifier: groupUniversalIdentifier,
    positionInViewFilterGroup: 1,
  },
];
