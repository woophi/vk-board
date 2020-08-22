export const cacheKey = {
  boardList: (userId: string) => `board_list_${userId}`,
  membership: (userId: string, taskId: string) =>
    `${taskId}_task_membership_${userId}`,
  tasks: (userId: string, listId: string) => `${listId}_tasks_${userId}`,
  canCreateList: (userId: number) => `${userId}_canCreateList`,
  canJoinList: (userId: number, listId: number) => `${userId}_canJoinList_${listId}`
};

export const dayTTL = 60 * 60 * 24;