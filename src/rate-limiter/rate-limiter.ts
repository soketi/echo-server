import { App } from './../app';
import { ConsumptionResponse, RateLimiterDriver } from './rate-limiter-driver';
import { LocalRateLimiter } from './local-rate-limiter';
import { Log } from './../log';
import { Options } from './../options';
import { RedisRateLimiter } from './redis-rate-limiter';
import { Socket } from './../socket';

export class RateLimiter implements RateLimiterDriver {
    /**
     * Rate Limiter driver.
     *
     * @type {RateLimiterDriver}
     */
    protected driver: RateLimiterDriver;

    /**
     * Initialize the rate limiter driver.
     */
    constructor(protected options: Options) {
        if (options.rateLimiter.driver === 'local') {
            this.driver = new LocalRateLimiter(options);
        } else if (options.rateLimiter.driver === 'redis') {
            this.driver = new RedisRateLimiter(options);
        } else {
            Log.error('No rate limiter driver specified.');
        }
    }

    /**
     * Consume the points for backend-received events.
     */
    consumeBackendEventPoints(points: number): Promise<ConsumptionResponse> {
        return this.driver.consumeBackendEventPoints(points);
    }

    /**
     * Consume the points for frontend-received events.
     */
    consumeFrontendEventPoints(points: number): Promise<ConsumptionResponse> {
        return this.driver.consumeFrontendEventPoints(points);
    }

     /**
      * Consume the points for HTTP read requests.
      */
    consumeReadRequestsPoints(points: number): Promise<ConsumptionResponse> {
        return this.driver.consumeReadRequestsPoints(points);
    }

     /**
      * Set the app to calculate the rate limiter for.
      */
    forApp(app: App): RateLimiterDriver {
        return this.driver.forApp(app);
    }

    /**
     * Set the socket to calculate the rate limiter for.
     */
    forSocket(socket: Socket): RateLimiterDriver {
        return this.driver.forSocket(socket);
    }
}
