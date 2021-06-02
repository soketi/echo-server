import { LocalRateLimiter } from './local-rate-limiter';
import { RateLimiterRedis } from 'rate-limiter-flexible';

const Redis = require('ioredis');

export class RedisRateLimiter extends LocalRateLimiter {
    /**
     * Initialize the Redis rate limiter driver.
     *
     * @param {any} options
     */
    constructor(protected options: any) {
        super(options);

        this.rateLimiter = new RateLimiterRedis({
            points: 1,
            duration: 60,
            keyPrefix: '',
            storeClient: new Redis(options.database.redis),
        });
    }
}
