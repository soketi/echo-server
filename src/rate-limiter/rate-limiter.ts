import { App } from './../app';
import { LocalRateLimiter } from './local-rate-limiter';
import { Log } from './../log';
import { Options } from './../options';
import { RateLimiterDriver } from './rate-limiter-driver';
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
     *
     * @param {Options} options
     */
    constructor(protected options: Options) {
        if (options.rateLimiter.driver === 'local') {
            this.driver = new LocalRateLimiter(options);
        } else if (options.rateLimiter.driver === 'redis') {
            this.driver = new RedisRateLimiter(options);
        } else {
            Log.error('No stats driver specified.');
        }
    }

    /**
     * Consume the points for backend-received events.
     *
     * @param  {number}  points
     * @return {Promise<any>}
     */
    consumeBackendEventPoints(points: number): Promise<any> {
        return this.driver.consumeBackendEventPoints(points);
    }

    /**
     * Consume the points for frontend-received events.
     *
     * @param  {number}  points
     * @return {Promise<any>}
     */
    consumeFrontendEventPoints(points: number): Promise<any> {
        return this.driver.consumeFrontendEventPoints(points);
    }

     /**
      * Consume the points for HTTP read requests.
      *
      * @param  {number}  points
      * @return {Promise<any>}
      */
    consumeReadRequestsPoints(points: number): Promise<any> {
        return this.driver.consumeReadRequestsPoints(points);
    }

     /**
      * Set the app to calculate the rate limiter for.
      *
      * @param  {App}  app
      * @return {RateLimiterDriver}
      */
    forApp(app: App): RateLimiterDriver {
        return this.driver.forApp(app);
    }

    /**
     * Set the socket to calculate the rate limiter for.
     *
     * @param  {Socket}  socket
     * @return {RateLimiterDriver}
     */
    forSocket(socket: Socket): RateLimiterDriver {
        return this.driver.forSocket(socket);
    }
}
