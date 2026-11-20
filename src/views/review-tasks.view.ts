import {
  defineView,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewFilterOperand,
  ViewSortDirection,
  ViewType,
} from 'twenty-sdk/define';

import { REVIEW_TASKS_VIEW } from 'src/constants/universal-identifiers';
import { REVIEW_TASK_TITLE_PREFIX } from 'src/constants/review-task';
import { column } from 'src/views/view-helpers';

const TASK = STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task;

// Open "Review website visitor" tasks, newest first.
export default defineView({
  universalIdentifier: REVIEW_TASKS_VIEW.view,
  name: 'Website visitor reviews',
  objectUniversalIdentifier: TASK.universalIdentifier,
  icon: 'IconWorldWww',
  type: ViewType.TABLE,
  position: 100,
  fields: [
    column(REVIEW_TASKS_VIEW.fieldTitle, TASK.fields.title.universalIdentifier, 0, 320),
    column(REVIEW_TASKS_VIEW.fieldStatus, TASK.fields.status.universalIdentifier, 1, 110),
    column(REVIEW_TASKS_VIEW.fieldAssignee, TASK.fields.assignee.universalIdentifier, 2, 150),
    column(REVIEW_TASKS_VIEW.fieldDueAt, TASK.fields.dueAt.universalIdentifier, 3, 130),
    column(REVIEW_TASKS_VIEW.fieldCreatedAt, TASK.fields.createdAt.universalIdentifier, 4, 140),
  ],
  filters: [
    {
      universalIdentifier: REVIEW_TASKS_VIEW.filterTitle,
      fieldMetadataUniversalIdentifier: TASK.fields.title.universalIdentifier,
      operand: ViewFilterOperand.CONTAINS,
      value: REVIEW_TASK_TITLE_PREFIX,
    },
    {
      universalIdentifier: REVIEW_TASKS_VIEW.filterNotDone,
      fieldMetadataUniversalIdentifier: TASK.fields.status.universalIdentifier,
      operand: ViewFilterOperand.IS_NOT,
      value: ['DONE'],
    },
  ],
  sorts: [
    {
      universalIdentifier: REVIEW_TASKS_VIEW.sortCreatedAt,
      fieldMetadataUniversalIdentifier: TASK.fields.createdAt.universalIdentifier,
      direction: ViewSortDirection.DESC,
    },
  ],
});
