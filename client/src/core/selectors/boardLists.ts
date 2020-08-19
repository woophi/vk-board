import { createSelector } from 'reselect';
import { getStateUi, getBoardUiState } from './common';
import { FetchingStateName, FetchingDataType, FetchingStatus } from 'core/models';
import { isBoardUpdating, getBoardLists } from './board';

const getNewListDataState = createSelector(
  getStateUi,
  (ui) => (ui.fetchingDatas[FetchingStateName.NewBoardList] ?? {}) as FetchingDataType<boolean>
);
const getDeleteListDataState = createSelector(
  getStateUi,
  (ui) => (ui.fetchingDatas[FetchingStateName.DeleteBoardList] ?? {}) as FetchingDataType<boolean>
);

export const isNewListUpdating = createSelector(
  getNewListDataState,
  (dataState) => dataState.status === FetchingStatus.Updating
);

export const isNewListCreated = createSelector(
  getNewListDataState,
  (dataState) => dataState.status === FetchingStatus.Ready && !!dataState.data
);

export const isDeleteListUpdating = createSelector(
  getDeleteListDataState,
  isBoardUpdating,
  (dataState, boardUpdating) => dataState.status === FetchingStatus.Updating || boardUpdating
);

export const isListMembershipOpenedByOwner = createSelector(
  getBoardLists,
  getBoardUiState,
  (list, { boardListOpenId }) => list.find(l => l.id === boardListOpenId)?.isOwner
)