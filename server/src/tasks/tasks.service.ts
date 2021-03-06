import { Injectable, CACHE_MANAGER, Inject, Logger } from '@nestjs/common';
import { Task } from 'src/db/tables/task';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Connection } from 'typeorm';
import {
  NewTaskModel,
  UpdateTaskModel,
  BoardTaskItem,
  TaskInfo,
  UpdateTaskNotification,
} from 'src/contracts/task';
import { List } from 'src/db/tables/list';
import { CacheManager } from 'src/custom-types/cache';
import { cacheKey } from 'src/contracts/cache';
import { errMap } from 'src/utils/errors';
import { EventBus } from 'src/events/events.bus';
import { BusEvents, TaskNotificationParams } from 'src/contracts/enum';
import { Notification } from 'src/db/tables/notification';
import * as moment from 'moment';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  constructor(
    @InjectRepository(Task)
    private tableTask: Repository<Task>,
    @InjectRepository(List)
    private tableList: Repository<List>,
    @InjectRepository(Notification)
    private tableNotification: Repository<Notification>,
    private connection: Connection,
    @Inject(CACHE_MANAGER) private cache: CacheManager,
  ) {}

  async createTask(model: NewTaskModel, vkUserId: number) {
    const queryRunner = this.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const list = await queryRunner.manager.findOne<List>(List, model.listId, {
        where: { deleted: null },
      });

      if (!list) {
        throw new Error(`List doesn't exist ${model.listId}`);
      }

      const newTask = new Task(
        model.name,
        vkUserId,
        list,
        model.description,
        model.dueDate ? moment(model.dueDate).toDate() : null,
      );
      await queryRunner.manager.save(newTask);

      if (model.notification) {
        await this.insertUserNotificationTasks([newTask.id], vkUserId);
      }

      await queryRunner.commitTransaction();

      await this.cache.del(cacheKey.tasks(String(model.listId)));

      EventBus.emit(BusEvents.NEW_TASK, {
        task: {
          id: newTask.id,
          created: newTask.created,
          deleted: null,
          description: newTask.description,
          dueDate: newTask.dueDate,
          finished: null,
          name: newTask.name,
          notificationUserId: model.notification ? vkUserId : null,
        } as BoardTaskItem,
        listGUID: list.listguid,
      });

      return newTask.id;
    } catch (err) {
      this.logger.error(errMap(err));
      await queryRunner.rollbackTransaction();
      throw new Error(err);
    } finally {
      await queryRunner.release();
    }
  }
  async updateTask(model: UpdateTaskModel, vkUserId: number) {
    const queryRunner = this.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const list = await queryRunner.manager.findOne<List>(List, model.listId, {
        where: { deleted: null },
      });

      if (!list) {
        throw new Error(`List doesn't exist ${model.listId}`);
      }

      await queryRunner.manager.update<Task>(Task, model.id, {
        name: model.name,
        description: model.description,
        dueDate: model.dueDate ? moment(model.dueDate).toDate() : null,
      });

      await queryRunner.commitTransaction();

      await this.cache.del(cacheKey.tasks(String(model.listId)));

      EventBus.emit(BusEvents.UPDATE_TASK, {
        task: {
          id: model.id,
          description: model.description,
          dueDate: model.dueDate,
          name: model.name,
        } as TaskInfo,
        listGUID: list.listguid,
      });
    } catch (err) {
      this.logger.error(errMap(err));
      await queryRunner.rollbackTransaction();
      throw new Error(err);
    } finally {
      await queryRunner.release();
    }
  }

  async getTasks(listId: number, vkUserId: number) {
    const notificationTasks = (await this.tableNotification.findOne(
      {
        userId: vkUserId,
      },
      { select: ['tasks'] },
    )) ?? { tasks: [] as string[] };
    let list = await this.tableList
      .createQueryBuilder('list')
      .innerJoinAndSelect(
        'list.tasks',
        'task',
        `task.list_id = ${listId} and task.deleted is null`,
      )
      .innerJoin(
        'list.memberships',
        'membership',
        `membership.joined_id = ${vkUserId} and membership.left_date is null`,
      )
      .where([
        {
          deleted: null,
          id: listId,
        },
      ])
      .orderBy({
        'task.created': 'DESC',
      })
      .getOne();

    return (
      list?.tasks.map((t) => ({
        ...t,
        notification: notificationTasks.tasks?.includes(t.id),
      })) ?? []
    );
  }
  async getNotFinishedTasks(listId: number, vkUserId: number) {
    const notificationTasks = (await this.tableNotification.findOne(
      {
        userId: vkUserId,
      },
      { select: ['tasks'] },
    )) ?? { tasks: [] as string[] };
    let list = await this.tableList
      .createQueryBuilder('list')
      .innerJoinAndSelect(
        'list.tasks',
        'task',
        `task.list_id = ${listId} and task.deleted is null and task.finished is null`,
      )
      .innerJoin(
        'list.memberships',
        'membership',
        `membership.joined_id = ${vkUserId} and membership.left_date is null`,
      )
      .where([
        {
          deleted: null,
          id: listId,
        },
      ])
      .orderBy({
        'task.created': 'DESC',
      })
      .getOne();

    return (
      list?.tasks.map((t) => ({
        ...t,
        notification: notificationTasks.tasks?.includes(t.id),
      })) ?? []
    );
  }
  async getTask(listId: number, vkUserId: number, taskId: string) {
    let list = await this.tableList
      .createQueryBuilder('list')
      .innerJoinAndSelect(
        'list.tasks',
        'task',
        `task.list_id = ${listId} and task.deleted is null and task.id = ${taskId} and task.finished is null`,
      )
      .innerJoin(
        'list.memberships',
        'membership',
        `membership.joined_id = ${vkUserId} and membership.left_date is null`,
      )
      .where([
        {
          deleted: null,
          id: listId,
        },
      ])
      .getOne();

    return list?.tasks;
  }
  async getTaskByName(listId: number, vkUserId: number, taskName: string) {
    let list = await this.tableList
      .createQueryBuilder('list')
      .innerJoinAndSelect(
        'list.tasks',
        'task',
        `task.list_id = ${listId} and task.deleted is null and task.name like '%${taskName}%' and task.finished is null`,
      )
      .innerJoin(
        'list.memberships',
        'membership',
        `membership.joined_id = ${vkUserId} and membership.left_date is null`,
      )
      .where([
        {
          deleted: null,
          id: listId,
        },
      ])
      .getOne();

    return list?.tasks;
  }

  async finishTasks(taskIds: string[], listId: number, vkUserId: number) {
    const now = new Date();

    await this.tableTask.update(taskIds, { finished: now });
    await this.cache.del(cacheKey.tasks(String(listId)));

    const list = await this.tableList.findOne(listId, { select: ['listguid'] });
    if (list) {
      EventBus.emit(BusEvents.FINISH_TASKS, {
        taskIds,
        listGUID: list.listguid,
      });
    }
  }
  async unfinishTasks(taskIds: string[], listId: number, vkUserId: number) {
    await this.tableTask.update(taskIds, { finished: null });
    await this.insertUserNotificationTasks(taskIds, vkUserId);
    await this.cache.del(cacheKey.tasks(String(listId)));

    const list = await this.tableList.findOne(listId, { select: ['listguid'] });
    if (list) {
      EventBus.emit(BusEvents.UNFINISH_TASKS, {
        taskIds,
        listGUID: list.listguid,
      });
    }
  }
  async deleteTask(taskId: string, listId: number, vkUserId: number) {
    const now = new Date();

    await this.tableTask.update(
      { id: taskId, list: { id: listId } },
      { deleted: now },
    );
    this.removeUserNotificationTasks([taskId], vkUserId);

    await this.cache.del(cacheKey.tasks(String(listId)));

    const list = await this.tableList.findOne(listId, { select: ['listguid'] });
    if (list) {
      EventBus.emit(BusEvents.DELETE_TASK, taskId, list.listguid);
    }
  }
  async updateNotificationTask(
    vkUserId: number,
    { taskId, listId, notification }: UpdateTaskNotification,
  ) {
    if (notification) {
      await this.insertUserNotificationTasks([taskId], vkUserId);
    } else {
      await this.removeUserNotificationTasks([taskId], vkUserId);
    }
    await this.cache.del(cacheKey.tasks(String(listId)));
    EventBus.emit(BusEvents.TASK_NOTIFICATION, {
      notification,
      taskId,
      userId: vkUserId,
    } as TaskNotificationParams);
  }

  async insertUserNotificationTasks(taskIds: string[], vkUserId: number) {
    const exists =
      (await this.tableNotification.count({ userId: vkUserId })) > 0;
    if (exists) {
      await this.connection.query(
        `update notification set tasks = array_cat(array_diff(tasks, array[${taskIds.join(
          ',',
        )}]::int8[]), array[${taskIds.join(
          ',',
        )}]::int8[]) where user_id = ${vkUserId}`,
      );
    } else {
      await this.connection.query(
        `insert into notification (user_id, vk_notification, tasks) values (${vkUserId}, true, array[${taskIds.join(
          ',',
        )}]::int8[])`,
      );
    }
  }

  async removeUserNotificationTasks(taskIds: string[], vkUserId: number) {
    await this.connection.query(
      `update notification set tasks = array_diff(tasks, array[${taskIds.join(
        ',',
      )}]::int8[]) where user_id = ${vkUserId}`,
    );
  }

  tryToValiadateBigInt(ids: string[]) {
    try {
      ids.map(BigInt);
      return true;
    } catch (error) {
      this.logger.error(errMap(error));
      return false;
    }
  }

  // TODO move to decorator
  validateDueDate(dueDate: Date | string | null) {
    if (dueDate === null) {
      return true;
    }

    if (moment(dueDate).isValid()) {
      const tomorrow = moment().add(1, 'day');
      const isBefore = moment(dueDate).isBefore(tomorrow, 'day');
      return !isBefore;
    }

    return false;
  }
}
