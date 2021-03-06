import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from 'src/config/db.config';
import cacheConfig from 'src/config/cache.config';
import coreConfig from 'src/config/core.config';
import integrationConfig from 'src/config/integration.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListModule } from './list/list.module';
import { BoardModule } from './board/board.module';
import { TasksModule } from './tasks/tasks.module';
import { EventsModule } from './events/events.module';
import { RestricitionsModule } from './restricitions/restricitions.module';
import { PaymentModule } from './payment/payment.module';
import { GoogleTasksModule } from './google-tasks/google-tasks.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from './notifications/notifications.module';
import { FetchLimiter } from './interceptors/rate-limiter';
import { ListController } from './list/list.controller';
import { BoardController } from './board/board.controller';
import { MarusyaController } from './marusya/marusya.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [databaseConfig, cacheConfig, coreConfig, integrationConfig],
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        ...(configService.get<string>('database.psqlUrl')
          ? {
              url: configService.get<string>('database.psqlUrl'),
            }
          : {
              host: configService.get<string>('database.host'),
              port: configService.get<number>('database.port'),
              username: configService.get<string>('database.username'),
              password: configService.get<string>('database.password'),
              database: configService.get<string>('database.dbName'),
            }),
        entities: [__dirname + '/db/tables/*{.ts,.js}'],
        migrations: [__dirname + '/db/migrations/*{.ts,.js}'],
        synchronize: false,
        migrationsRun: true,
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    ListModule,
    BoardModule,
    TasksModule,
    EventsModule,
    RestricitionsModule,
    PaymentModule,
    GoogleTasksModule,
    NotificationsModule,
  ],
  controllers: [AppController, MarusyaController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(FetchLimiter).forRoutes(ListController, BoardController);
  }
}
