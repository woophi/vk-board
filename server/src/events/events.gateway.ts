import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NameSpaces, SocketEvents, BusEvents } from 'src/contracts/enum';
import { EventBus } from './events.bus';
import { Inject, Logger } from '@nestjs/common';
import * as qs from 'querystring';
import * as crypto from 'crypto';
import integrationConfig from 'src/config/integration.config';
import { ConfigType } from '@nestjs/config';
import { RedisAdapter } from 'socket.io-redis';

@WebSocketGateway({ namespace: NameSpaces.SelctedList })
export class EventsGateway implements OnGatewayInit {
  private readonly logger = new Logger(EventsGateway.name);
  constructor(
    @Inject(integrationConfig.KEY)
    private config: ConfigType<typeof integrationConfig>,
  ) {}

  @WebSocketServer()
  server!: Server;

  afterInit(initServer: Server) {
    initServer.use((socket, next) => {
      const query = socket.handshake.query;

      const ordered: { [key: string]: any } = {};
      Object.keys(query)
        .sort()
        .forEach((key) => {
          if (key.slice(0, 3) === 'vk_') {
            ordered[key] = query[key];
          }
        });

      const stringParams = qs.stringify(ordered);
      const paramsHash = crypto
        .createHmac('sha256', this.config.vkSecretKey ?? '')
        .update(stringParams)
        .digest()
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=$/, '');

      const signed = paramsHash === query.sign;
      this.logger.log(`ws result ${signed}`);
      if (!signed) {
        next(new Error('Authentication error'));
      } else {
        next();
      }
    });

    const newTask = (taskId: number, listGUID: string) => {
      this.logger.log(`emit task ${taskId}`);
      initServer.to(listGUID).emit(SocketEvents.new_task, taskId);
    };
    const stopGsync = (userId: number) => {
      this.logger.log(`emit stopGsync for user ${userId}`);
      initServer.to(userId.toString()).emit(SocketEvents.stop_g_sync);
    };

    EventBus.on(BusEvents.STOP_G_SYNC, stopGsync);
    EventBus.on(BusEvents.NEW_TASK, newTask);
  }

  @SubscribeMessage('joinRoom')
  async joinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { listGUID, userId }: { listGUID?: string; userId: number },
  ) {
    await this.autoLeaveRooms(socket);

    const adapter = socket.adapter as RedisAdapter;

    if (listGUID) {
      adapter.remoteJoin(socket.id, listGUID, (error: Error) => {
        if (error) {
          this.logger.log(`joined room failed ${listGUID}`);
          this.logger.error(error);
        } else {
          this.logger.log(`joined room ${listGUID}`);
        }
      });
    }

    adapter.remoteJoin(socket.id, userId.toString(), (error: Error) => {
      if (error) {
        this.logger.log(`joined room failed ${userId}`);
        this.logger.error(error);
      } else {
        this.logger.log(`joined room ${userId}`);
      }
    });

    if (socket.listeners('disconnect').length < 3) {
      socket.once('disconnect', () => {
        this.logger.log('list socket disconnected');
        this.autoLeaveRooms(socket);
        socket.leaveAll();
      });
    }
  }

  @SubscribeMessage('leaveRoom')
  leaveRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() listGUID: string,
  ) {
    const adapter = socket.adapter as RedisAdapter;
    if (!!listGUID) {
      adapter.remoteLeave(socket.id, listGUID, (err: Error) => {
        if (err) {
          this.logger.error(err);
        }
      });
    }
  }

  autoLeaveRooms(socket: Socket) {
    return new Promise((res) => {
      const adapter = socket.adapter as RedisAdapter;
      adapter.clientRooms(socket.id, (err: Error, rooms: string[]) => {
        if (err) {
          this.logger.error(err);
        } else if (rooms?.length) {
          rooms.reduce((r) => {
            adapter.remoteLeave(socket.id, r, (err: Error) => {
              if (err) {
                this.logger.error(err);
              }
            });
            return '';
          });
        }
        return res();
      });
    });
  }
}
