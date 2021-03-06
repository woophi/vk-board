import { MembershipItem } from './membership';

export type BoardListItem = {
  listguid: string;
  name: string;
  id: number;
  created: string;
  createdBy: number;
  memberships: MembershipItem[];
};

export type BoardTaskItem = {
  name: string;
  description: string | null;
  notification: boolean;
  id: string;
  created: string;
  dueDate: string | null;
  finished: string | null;
  deleted: null;
  memberships: MembershipItem[];
};

export type TaskInfo = Pick<
  BoardTaskItem,
  'id' | 'dueDate' | 'name' | 'description' | 'notification'
>;

export type BoardState = {
  boardListName: string;
  firstBoardListName: string;
  editBoardListName: string;
  boardListOpenId: number;
  boardListToDeleteId: number;
  selectedList: {
    id: number;
    data: BoardListItem;
    tasks: BoardTaskItem[];
  };
  newTask: {
    name: string;
    description: string | null;
    dueDate: string | null;
    notification: boolean;
  };
  tasksToBeFinished: string[];
  tasksToBeUnfinished: string[];
  selectedTask: TaskInfo;
  editedTask: TaskInfo;
};

export type NewTaskModel = {
  name: string;
  description: string;
  dueDate: string | null;
  listId: number;
  notification: boolean;
};

export type EditTaskModel = {
  id: string;
} & NewTaskModel;
