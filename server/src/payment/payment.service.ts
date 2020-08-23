import { Injectable, Inject, CACHE_MANAGER } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Payment } from 'src/db/tables/payment';
import { Repository, Connection } from 'typeorm';
import { premiumPrice, syncRestrictionHours } from 'src/constants/premium';
import { CacheManager } from 'src/custom-types/cache';
import { cacheKey, dayTTL } from 'src/contracts/cache';
import * as moment from 'moment';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private tablePayment: Repository<Payment>,
    private connection: Connection,
    @Inject(CACHE_MANAGER) private cache: CacheManager,
  ) {}

  async hasUserPremium(vkUserId: number) {
    const cacheHas = await this.cache.get<boolean>(
      cacheKey.hasPremium(vkUserId),
    );

    if (cacheHas) {
      return cacheHas;
    }

    const has =
      (await this.tablePayment.count({
        user_id: vkUserId,
        amount: premiumPrice.toString(),
      })) > 0;

    await this.cache.set(cacheKey.hasPremium(vkUserId), has, {
      ttl: dayTTL,
    });

    return has;
  }

  async makePremium(vkUserId: number, amount: string) {
    const queryRunner = this.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const newPayment = new Payment(amount, vkUserId);
      await queryRunner.manager.save(newPayment);

      await queryRunner.commitTransaction();

      await this.cache.del(cacheKey.hasPremium(vkUserId));

      return true;
    } catch (err) {
      console.error(err);
      await queryRunner.rollbackTransaction();
      throw new Error(err);
    } finally {
      await queryRunner.release();
    }
  }

  async updatePremiumGoogleSync(user_id: number) {
    var now = new Date();
    console.log('Final step for g sync for user', user_id);
    await this.tablePayment.update({ user_id }, { last_g_sync: now });

    await this.cache.del(cacheKey.googleSync(user_id));
    await this.cache.del(cacheKey.boardList(String(user_id)));
  }

  async getDurationOf24HoursBeforeNewSync(user_id: number) {
    try {
      const cachedHrs = await this.cache.get<number>(
        cacheKey.googleSync(user_id),
      );
      if (cachedHrs) {
        return cachedHrs;
      }
      const paymentTime = await this.tablePayment.findOne({ user_id });

      if (!paymentTime || paymentTime.last_g_sync === null) {
        return syncRestrictionHours;
      }

      const computedDuration = moment.duration({
        from: moment().add(
          moment.duration(moment(paymentTime.last_g_sync).diff(moment())),
        ),
        to: moment(),
      });

      const hrs = computedDuration.asHours();

      await this.cache.set(cacheKey.googleSync(user_id), hrs, { ttl: 60 });
      return hrs;
    } catch (error) {
      console.error(error);
      return syncRestrictionHours;
    }
  }
}
