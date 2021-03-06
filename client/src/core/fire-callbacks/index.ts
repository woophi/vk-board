import { client } from 'core/callbacks';
import { store } from 'core/store';
import { FetchingStateName, BoardTaskItem, ListUpdatedType, BoardListItem } from 'core/models';
import { getSelectedList, selectedBoardListInfo } from 'core/selectors/boardLists';
import { sortByCreated } from 'core/utils';
import { getBoardListData } from 'core/selectors/board';
import { getUserId } from 'core/selectors/user';

client.new_task = (task) => {
  const state = store.getState();
  const { tasks } = getSelectedList(state);
  const userId = getUserId(state);

  if (tasks.find((t) => String(t.id) === String(task.id))) {
    return;
  }
  store.dispatch({
    type: 'SET_BOARD_TASKS',
    payload: [{ ...task, notification: task.notificationUserId === userId }, ...tasks],
  });
};

client.task_notification = ({ taskId, notification }) => {
  const state = store.getState();
  const { tasks } = getSelectedList(state);

  const updatedTasks = tasks.reduce((acc, task) => {
    if (task.id === taskId) {
      return acc.concat({ ...task, notification });
    }
    return acc.concat(task);
  }, [] as BoardTaskItem[]);

  store.dispatch({
    type: 'SET_BOARD_TASKS',
    payload: updatedTasks,
  });
};

client.finish_tasks = ({ taskIds }) => {
  const now = new Date().toString();
  const { tasks } = getSelectedList(store.getState());
  const [finishedTasks, notFinishedTasks] = tasks.reduce(
    (acc, task) => {
      const [f, n] = acc;
      if (taskIds.includes(task.id) || task.finished) {
        return [f.concat({ ...task, finished: now }), n];
      }
      return [f, n.concat(task)];
    },
    [[], []] as [BoardTaskItem[], BoardTaskItem[]]
  );
  store.dispatch({
    type: 'SET_BOARD_TASKS',
    payload: notFinishedTasks.concat(finishedTasks),
  });
};
client.unfinish_tasks = ({ taskIds }) => {
  const { tasks } = getSelectedList(store.getState());
  const [finishedTasks, notFinishedTasks] = tasks.reduce(
    (acc, task) => {
      const [f, n] = acc;
      if (taskIds.includes(task.id)) {
        return [f, n.concat({ ...task, finished: null })];
      }
      if (task.finished) {
        return [f.concat(task), n];
      }
      return [f, n.concat(task)];
    },
    [[], []] as [BoardTaskItem[], BoardTaskItem[]]
  );
  store.dispatch({
    type: 'SET_BOARD_TASKS',
    payload: notFinishedTasks.concat(finishedTasks).sort(sortByCreated),
  });
};

client.update_task = (updatedTask) => {
  const { tasks } = getSelectedList(store.getState());

  const updatedTasks = tasks.reduce((acc, task) => {
    if (task.id === updatedTask.id) {
      return acc.concat({ ...task, ...updatedTask });
    }
    return acc.concat(task);
  }, [] as BoardTaskItem[]);
  store.dispatch({
    type: 'SET_BOARD_TASKS',
    payload: updatedTasks,
  });
};
client.delete_task = (taskId) => {
  const { tasks } = getSelectedList(store.getState());

  store.dispatch({
    type: 'SET_BOARD_TASKS',
    payload: tasks.filter((t) => t.id !== `${taskId}`),
  });
};

client.stop_g_sync = () => {
  console.warn('stop_g_sync');
  store.dispatch({ type: 'SET_UPDATING_DATA', payload: FetchingStateName.PaymentInfo });
};

client.payment_complete = () => {
  console.warn('payment_complete');
  store.dispatch({
    type: 'SET_READY_DATA',
    payload: {
      name: FetchingStateName.PaymentProccess,
      data: true,
    },
  });
  store.dispatch({ type: 'SET_UPDATING_DATA', payload: FetchingStateName.PaymentInfo });
};

client.list_updated = ({ updatedType, listGUID, name, member }) => {
  const state = store.getState();
  const boardLists = getBoardListData(state);

  switch (updatedType) {
    case ListUpdatedType.Name: {
      const info = selectedBoardListInfo(state);

      if (!name) {
        break;
      }

      if (info.listguid === listGUID) {
        store.dispatch({
          type: 'SELECT_BOARD_LIST',
          payload: {
            id: info.id,
            data: {
              ...info,
              name,
            },
          },
        });
      }

      const newBoardLists = boardLists.reduce((acc, list) => {
        if (list.listguid === listGUID) {
          return acc.concat({
            ...list,
            name,
          });
        }

        return acc.concat(list);
      }, [] as BoardListItem[]);

      store.dispatch({
        type: 'SET_READY_DATA',
        payload: {
          name: FetchingStateName.Board,
          data: newBoardLists,
        },
      });
      break;
    }
    case ListUpdatedType.Deleted:
      const firstAvailList = boardLists.filter((l) => l.listguid !== listGUID)[0];
      const info = selectedBoardListInfo(state);

      if (firstAvailList && info.listguid === listGUID) {
        store.dispatch({
          type: 'SELECT_BOARD_LIST',
          payload: {
            id: firstAvailList.id,
            data: firstAvailList,
          },
        });
        store.dispatch({ type: 'SET_UPDATING_DATA', payload: FetchingStateName.Tasks });
      } else if (info.listguid === listGUID) {
        store.dispatch({
          type: 'SELECT_BOARD_LIST',
          payload: {
            id: 0,
            data: {
              created: '',
              createdBy: 0,
              id: 0,
              listguid: '',
              memberships: [],
              name: '',
            },
          },
        });
        store.dispatch({
          type: 'SET_BOARD_TASKS',
          payload: [],
        });
      }

      const newBoardLists = boardLists.reduce((acc, list) => {
        if (list.listguid === listGUID) {
          return acc;
        }

        return acc.concat(list);
      }, [] as BoardListItem[]);

      store.dispatch({
        type: 'SET_READY_DATA',
        payload: {
          name: FetchingStateName.Board,
          data: newBoardLists,
        },
      });
      break;
    case ListUpdatedType.AddMember: {
      if (!member) {
        break;
      }

      const info = selectedBoardListInfo(state);

      if (info.listguid === listGUID) {
        store.dispatch({
          type: 'SELECT_BOARD_LIST',
          payload: {
            id: info.id,
            data: {
              ...info,
              memberships: info.memberships.concat(member),
            },
          },
        });
      }

      const boardLists = getBoardListData(state);

      const newBoardLists = boardLists.reduce((acc, list) => {
        if (list.listguid === listGUID) {
          return acc.concat({
            ...list,
            memberships: list.memberships.concat(member),
          });
        }

        return acc.concat(list);
      }, [] as BoardListItem[]);

      store.dispatch({
        type: 'SET_READY_DATA',
        payload: {
          name: FetchingStateName.Board,
          data: newBoardLists,
        },
      });

      break;
    }

    case ListUpdatedType.DropMember: {
      if (!member) {
        break;
      }
      const info = selectedBoardListInfo(state);
      if (info.listguid === listGUID) {
        store.dispatch({
          type: 'SELECT_BOARD_LIST',
          payload: {
            id: info.id,
            data: {
              ...info,
              memberships: info.memberships.filter((m) => m.userId !== member.userId),
            },
          },
        });
      }
      const boardLists = getBoardListData(state);
      const newBoardLists = boardLists.reduce((acc, list) => {
        if (list.listguid === listGUID) {
          return acc.concat({
            ...list,
            memberships: list.memberships.filter((m) => m.userId !== member.userId),
          });
        }

        return acc.concat(list);
      }, [] as BoardListItem[]);

      store.dispatch({
        type: 'SET_READY_DATA',
        payload: {
          name: FetchingStateName.Board,
          data: newBoardLists,
        },
      });
      break;
    }

    default:
      break;
  }
};
