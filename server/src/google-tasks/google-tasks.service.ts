import { Injectable, HttpService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildQueryString } from 'src/utils/api';
import { google, tasks_v1 } from 'googleapis';
import { GList } from 'src/db/tables/gList';
import { Connection } from 'typeorm';
import { List } from 'src/db/tables/list';
import { Task } from 'src/db/tables/task';
import { ListMembership } from 'src/db/tables/listMembership';
import { PaymentService } from 'src/payment/payment.service';

const tasks = google.tasks('v1');

const scopes = [
  'email',
  'profile',
  encodeURI('https://www.googleapis.com/auth/userinfo.email'),
  encodeURI('https://www.googleapis.com/auth/userinfo.profile'),
  'openid',
  encodeURI('https://www.googleapis.com/auth/tasks.readonly'),
];

@Injectable({ scope: Scope.REQUEST })
export class GoogleTasksService {
  constructor(
    private httpService: HttpService,
    private config: ConfigService,
    private connection: Connection,
    private paymentService: PaymentService,
  ) {}

  getHost(hostName: string) {
    return this.config.get<boolean>('core.devMode')
      ? `http://${hostName}:${this.config.get<boolean>('core.port')}`
      : `https://${hostName}`;
  }

  googleAuthFirstStep(hostName: string, userId: number) {
    const host = this.getHost(hostName);
    const url = `https://accounts.google.com/o/oauth2/v2/auth${buildQueryString(
      [
        { client_id: this.config.get<string>('integration.gClient', '') },
        { redirect_uri: `${host}/google/complete` },
        { response_type: 'code' },
        { scope: scopes.join('+') },
        { prompt: 'select_account' },
        { state: `${userId}` },
      ],
    )}`;
    return url;
  }

  async processGoogleLogin(code: string, hostName: string, userId: number) {
    const host = this.getHost(hostName);

    const accessToken = await this.getAccessToken(code, host);
    if (!accessToken) {
      return `<h1>Что-то пошло не так у пользователя ${userId}. Сделайте скрин и напишите нам в поддержку.</h1>`;
    }

    this.getGoogleTaskLists(accessToken, Number(userId));

    return '<h1>Google аккаунт успешно авторизован. Вы можете закрыть это окно.</h1><h2>Синхронизация займет какое-то время.</h2>';
  }

  async getAccessToken(code: string, host: string) {
    const result = await this.httpService
      .post(
        `https://www.googleapis.com/oauth2/v4/token${buildQueryString([
          { code: code },
          { client_id: this.config.get<string>('integration.gClient', '') },
          {
            client_secret: this.config.get<string>(
              'integration.gClientSecret',
              '',
            ),
          },
          { redirect_uri: `${host}/google/complete` },
          { grant_type: 'authorization_code' },
        ])}`,
      )
      .toPromise();

    if (result.data.error) {
      console.log(
        '[GoogleTasksService] access_token failed',
        result.data.error?.error_msg,
      );
      return '';
    }

    return result.data.access_token ?? '';
  }

  async getGoogleTaskLists(access_token: string, userId: number) {
    let taskLists: tasks_v1.Schema$TaskList[] = [];

    const response = await tasks.tasklists.list({
      access_token,
      maxResults: 100,
    });
    taskLists = response.data.items ?? [];

    while (taskLists.length === 100) {
      const subResponse = await tasks.tasklists.list({
        access_token,
        maxResults: 100,
      });
      taskLists = subResponse.data.items ?? [];
    }

    await this.createLists(taskLists, userId);

    await this.getGoogleTasks(
      access_token,
      userId,
      taskLists.map((t) => t.id ?? ''),
    );

    await this.paymentService.updatePremiumGoogleSync(userId);
  }

  async createLists(taskLists: tasks_v1.Schema$TaskList[], userId: number) {
    const queryRunner = this.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      for (const taskList of taskLists) {
        const existedList = await queryRunner.manager.findOne<GList>(GList, {
          g_list_id: taskList.id ?? '',
        });

        if (existedList) {
          continue;
        }
        const newList = new List(
          taskList.title ?? `Google task list ${taskList.id}`,
          userId,
        );
        await queryRunner.manager.save(newList);

        const listMembership = new ListMembership(userId, newList);
        await queryRunner.manager.save(listMembership);

        const newGList = new GList(newList, taskList.id ?? '');
        await queryRunner.manager.save(newGList);
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      console.error(err);
      await queryRunner.rollbackTransaction();
      throw new Error(err);
    } finally {
      await queryRunner.release();
    }
  }

  async getGoogleTasks(
    access_token: string,
    userId: number,
    listIds: string[],
  ) {
    for (const listId of listIds) {
      let tasksList: tasks_v1.Schema$Task[] = [];

      const response = await tasks.tasks.list({
        tasklist: listId,
        access_token,
        maxResults: 100,
      });
      tasksList = response.data.items ?? [];

      while (tasksList.length === 100) {
        const subResponse = await tasks.tasks.list({
          access_token,
          maxResults: 100,
        });
        tasksList = subResponse.data.items ?? [];
      }
      await this.createTasks(tasksList, userId, listId);
    }
  }

  async createTasks(
    tasks: tasks_v1.Schema$Task[],
    userId: number,
    gListId: string,
  ) {
    const queryRunner = this.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const gListWithTasks = await queryRunner.manager.findOne<GList>(
        GList,
        {
          g_list_id: gListId,
        },
        { relations: ['tasks', 'list'] },
      );

      if (!gListWithTasks || !gListWithTasks.list) {
        throw new Error(`List google doesn't exist ${gListId}`);
      }

      const tasksToSave = tasks
        .filter(
          (task) =>
            !gListWithTasks.tasks.find((te) => te.g_task_id === task.id),
        )
        .map(
          (task) =>
            new Task(
              task.title ?? `Google task ${task.id}`,
              userId,
              gListWithTasks?.list,
              task.notes,
              task.due ?? null,
              task.id,
              gListWithTasks,
              task.completed,
            ),
        );
      await queryRunner.manager.save(tasksToSave);

      await queryRunner.commitTransaction();
    } catch (err) {
      console.error(err);
      await queryRunner.rollbackTransaction();
      throw new Error(err);
    } finally {
      await queryRunner.release();
    }
  }
}