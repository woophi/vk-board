import * as models from 'core/models';
import { FetchingStatus, ClientTheme, appId, FINISH_TASK_TIMER_VALUE } from 'core/models';

const hashListGUID = window.location.hash ? window.location.hash.split('#').pop() : null;

export const initialState: models.AppState['ui'] = {
  theme: ClientTheme.Light,
  errorsQueue: [],
  fetchingDatas: {},
  notifications: false,
  appId,
  hashListGUID: hashListGUID ?? null,
  online: true,
  initialQuery: '',
  isAppUser: true,
  onlineHandleActivate: true,
  activeModal: null,
  board: {
    selectedList: {
      data: {
        created: '',
        createdBy: 0,
        id: 0,
        listguid: '',
        memberships: [],
        name: '',
      },
      id: 1,
      tasks: [],
    },
    boardListName: '',
    firstBoardListName: '',
    editBoardListName: '',
    boardListOpenId: 0,
    boardListToDeleteId: 0,
    newTask: {
      description: '',
      dueDate: '',
      name: '',
      notification: false,
    },
    tasksToBeUnfinished: [],
    tasksToBeFinished: [],
    selectedTask: {
      id: '',
      name: '',
      description: '',
      dueDate: '',
      notification: false,
    },
    editedTask: {
      id: '',
      name: '',
      description: '',
      dueDate: '',
      notification: false,
    },
  },
  membership: {
    dropUserId: 0,
  },
  showAds: true,
  googleSyncClicked: false,
  tasksToBeFinishedTimer: FINISH_TASK_TIMER_VALUE,
  snackVisible: false,
};

export const reducer = (
  state = initialState,
  dispatch: models.AppDispatch
): models.AppState['ui'] => {
  switch (dispatch.type) {
    case 'SET_THEME': {
      return {
        ...state,
        theme: dispatch.payload,
      };
    }
    case 'SET_UPDATING_DATA': {
      return {
        ...state,
        fetchingDatas: {
          ...state.fetchingDatas,
          [dispatch.payload]: {
            ...(state.fetchingDatas[dispatch.payload] ?? {}),
            status: FetchingStatus.Updating,
          },
        },
      };
    }
    case 'SET_READY_DATA': {
      return {
        ...state,
        fetchingDatas: {
          ...state.fetchingDatas,
          [dispatch.payload.name]: {
            ...(state.fetchingDatas[dispatch.payload.name] ?? {}),
            status: FetchingStatus.Ready,
            data: dispatch.payload.data,
          },
        },
      };
    }
    case 'SET_ERROR_DATA': {
      return {
        ...state,
        fetchingDatas: {
          ...state.fetchingDatas,
          [dispatch.payload.name]: {
            ...(state.fetchingDatas[dispatch.payload.name] ?? {}),
            status: FetchingStatus.Error,
            error: dispatch.payload.error,
          },
        },
        errorsQueue:
          state.errorsQueue.includes(dispatch.payload.error) ||
          (typeof dispatch.payload.error === 'string' &&
            dispatch.payload.error.includes('Cannot load '))
            ? state.errorsQueue
            : [...state.errorsQueue, dispatch.payload.error],
      };
    }

    case 'SET_NOTIFICATIONS': {
      return {
        ...state,
        notifications: dispatch.payload,
      };
    }
    case 'SET_APPID': {
      return {
        ...state,
        appId: dispatch.payload,
      };
    }
    case 'SET_HASH': {
      return {
        ...state,
        hashListGUID: dispatch.payload,
      };
    }
    case 'SET_APP_CONNECT': {
      return {
        ...state,
        online: dispatch.payload,
      };
    }
    case 'SET_INIT_QUERY': {
      return {
        ...state,
        initialQuery: dispatch.payload,
      };
    }
    case 'SET_APP_USER': {
      return {
        ...state,
        isAppUser: dispatch.payload,
      };
    }

    case 'HANDLE_ACTIVATE_INIT': {
      return {
        ...state,
        onlineHandleActivate: dispatch.payload,
      };
    }

    case 'SET_MODAL': {
      return {
        ...state,
        activeModal: dispatch.payload,
      };
    }
    case 'SELECT_BOARD_LIST': {
      return {
        ...state,
        board: {
          ...state.board,
          selectedList: {
            ...state.board.selectedList,
            id: dispatch.payload.id,
            data: dispatch.payload.data ?? state.board.selectedList.data,
          },
        },
      };
    }
    case 'SET_BOARD_TASKS': {
      return {
        ...state,
        board: {
          ...state.board,
          selectedList: {
            ...state.board.selectedList,
            tasks: dispatch.payload,
          },
        },
      };
    }
    case 'OPEN_BOARD_LIST': {
      return {
        ...state,
        board: {
          ...state.board,
          boardListOpenId: dispatch.payload,
        },
      };
    }
    case 'UPDATE_NEW_TASK': {
      return {
        ...state,
        board: {
          ...state.board,
          newTask: {
            ...state.board.newTask,
            [dispatch.payload.name]: dispatch.payload.value,
          },
        },
      };
    }
    case 'RESET_NEW_TASK': {
      return {
        ...state,
        board: {
          ...state.board,
          newTask: {
            description: null,
            dueDate: null,
            name: '',
            notification: state.notifications,
          },
        },
      };
    }
    case 'FINISH_TASK': {
      return {
        ...state,
        board: {
          ...state.board,
          tasksToBeFinished: [...state.board.tasksToBeFinished, dispatch.payload],
        },
      };
    }
    case 'REMOVE_FINISH_TASK': {
      return {
        ...state,
        board: {
          ...state.board,
          tasksToBeFinished: state.board.tasksToBeFinished.filter(
            (tId) => tId !== dispatch.payload
          ),
        },
      };
    }
    case 'UNFINISH_TASK': {
      return {
        ...state,
        board: {
          ...state.board,
          tasksToBeUnfinished: [...state.board.tasksToBeUnfinished, dispatch.payload],
        },
      };
    }
    case 'REMOVE_UNFINISH_TASK': {
      return {
        ...state,
        board: {
          ...state.board,
          tasksToBeUnfinished: state.board.tasksToBeUnfinished.filter(
            (tId) => tId !== dispatch.payload
          ),
        },
      };
    }
    case 'RESET_FINISH_TASKS': {
      return {
        ...state,
        board: {
          ...state.board,
          tasksToBeFinished: dispatch.payload,
        },
      };
    }
    case 'RESET_UNFINISH_TASKS': {
      return {
        ...state,
        board: {
          ...state.board,
          tasksToBeUnfinished: dispatch.payload,
        },
      };
    }
    case 'SELECT_TASK': {
      return {
        ...state,
        board: {
          ...state.board,
          selectedTask: dispatch.payload,
          editedTask: dispatch.payload,
        },
      };
    }
    case 'EDIT_TASK': {
      return {
        ...state,
        board: {
          ...state.board,
          editedTask: {
            ...state.board.editedTask,
            [dispatch.payload.name]: dispatch.payload.value,
          },
        },
      };
    }

    case 'SET_BOARD_LIST_NAME': {
      return {
        ...state,
        board: {
          ...state.board,
          boardListName: dispatch.payload,
        },
      };
    }
    case 'SET_FINISH_TASK_TIMER': {
      return {
        ...state,
        tasksToBeFinishedTimer: dispatch.payload,
      };
    }
    case 'DROP_MEMBER_SHIP_ID': {
      return {
        ...state,
        membership: {
          ...state.membership,
          dropUserId: dispatch.payload,
        },
      };
    }

    case 'SET_DELETE_BOARD_LIST_ID': {
      return {
        ...state,
        board: {
          ...state.board,
          boardListToDeleteId: dispatch.payload,
        },
      };
    }
    case 'EDIT_BOARD_LIST_NAME': {
      return {
        ...state,
        board: {
          ...state.board,
          editBoardListName: dispatch.payload.name,
        },
      };
    }
    case 'SET_FIRST_BOARD_LIST_NAME': {
      return {
        ...state,
        board: {
          ...state.board,
          firstBoardListName: dispatch.payload,
        },
      };
    }
    case 'SET_ADS': {
      return {
        ...state,
        showAds: dispatch.payload,
      };
    }
    case 'ENQUEUE_ERROR': {
      return {
        ...state,
        errorsQueue: state.errorsQueue.includes(dispatch.payload)
          ? state.errorsQueue
          : [...state.errorsQueue, dispatch.payload],
      };
    }
    case 'DEQUEUE_ERROR': {
      return {
        ...state,
        errorsQueue: state.errorsQueue.filter((e) => e !== dispatch.payload),
      };
    }
    case 'SET_SNACK': {
      return {
        ...state,
        snackVisible: dispatch.payload,
      };
    }

    case 'SET_QUEUE_ERROR': {
      return {
        ...state,
        errorsQueue: dispatch.payload,
      };
    }
    case 'SET_GOOGLE_SYNC': {
      return {
        ...state,
        googleSyncClicked: dispatch.payload,
      };
    }

    default: {
      return state;
    }
  }
};
