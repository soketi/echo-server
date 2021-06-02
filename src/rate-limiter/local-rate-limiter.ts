import { App } from './../app';
import { RateLimiterDriver } from './rate-limiter-driver';
import { RateLimiterAbstract, RateLimiterMemory } from 'rate-limiter-flexible';

export class LocalRateLimiter implements RateLimiterDriver {
    /**
     * The rate limiter used for the Local driver.
     *
     * @type {RateLimiterAbstract}
     */
    protected rateLimiter: RateLimiterAbstract;

    /**
     * The App instance to calculate the rate limiter for.
     *
     * @type {App}
     */
    protected app: App;

    /**
     * The Socket instance to calculate the rate limiter for.
     *
     * @type {any}
     */
    protected socket: any;

    /**
     * Initialize the local rate limiter driver.
     *
     * @param {any} options
     */
    constructor(protected options: any) {
        this.rateLimiter = new RateLimiterMemory({
            points: 1,
            duration: 60,
            keyPrefix: '',
        });
    }

    /**
     * Set the app to calculate the rate limiter for.
     *
     * @param  {App}  app
     * @return {RateLimiterDriver}
     */
    forApp(app: App): RateLimiterDriver {
        this.app = app;

        return this;
    }

    /**
     * Set the socket to calculate the rate limiter for.
     *
     * @param  {any}  socket
     * @return {RateLimiterDriver}
     */
    forSocket(socket: any): RateLimiterDriver {
        this.socket = socket;

        return this;
    }

    /**
     * Consume the points for backend-received events.
     *
     * @param  {number}  points
     * @return {Promise<any>}
     */
    consumeBackendEventPoints(points: number): Promise<any> {
        this.rateLimiter.points = this.app.maxBackendEventsPerMinute;

        return this.consumeForKey(`backend:events:${this.app.id}`, points);
    }

    /**
     * Consume the points for frontend-received events.
     *
     * @param  {number}  points
     * @return {Promise<any>}
     */
    consumeFrontendEventPoints(points: number): Promise<any> {
        this.rateLimiter.points = this.app.maxClientEventsPerMinute;

        return this.consumeForKey(`frontend:events:${this.socket.id}:${this.app.id}`, points);
    }

    /**
     * Consume the points for HTTP read requests.
     *
     * @param  {number}  points
     * @return {Promise<any>}
     */
    consumeReadRequestsPoints(points: number): Promise<any> {
        this.rateLimiter.points = this.app.maxReadRequestsPerMinute;

        return this.consumeForKey(`backend:request_read:${this.app.id}`, points);
    }

    /**
     * Consume points for a given key, then
     * return a response object with headers and
     * the success indicator.
     *
     * @param  {string}  key
     * @param  {number}  points
     * @return {Promise<any>}
     */
    protected consumeForKey(key: string, points: number): Promise<any> {
        if (this.rateLimiter.points < 0) {
            return new Promise(resolve => resolve({ rateLimiterRes: null, headers: [] }));
        }

        return new Promise((resolve, reject) => {
            let calculateHeaders = rateLimiterRes => ({
                'Retry-After': rateLimiterRes.msBeforeNext / 1000,
                'X-RateLimit-Limit': this.rateLimiter.points,
                'X-RateLimit-Remaining': rateLimiterRes.remainingPoints,
            });

            this.rateLimiter.consume(key, points).then(rateLimiterRes => {
                resolve({
                    rateLimiterRes,
                    headers: calculateHeaders(rateLimiterRes),
                });
            }).catch(rateLimiterRes => {
                reject({
                    rateLimiterRes,
                    headers: calculateHeaders(rateLimiterRes),
                });
            });
        });
    }
}