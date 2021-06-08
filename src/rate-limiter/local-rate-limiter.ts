import { App } from './../app';
import { ConsumptionResponse, RateLimiterDriver } from './rate-limiter-driver';
import { Options } from './../options';
import { RateLimiterAbstract, RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { Socket } from './../socket';

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
    protected socket: Socket;

    /**
     * Initialize the local rate limiter driver.
     */
    constructor(protected options: Options) {
        this.rateLimiter = new RateLimiterMemory({
            points: 1,
            duration: 60,
            keyPrefix: '',
        });
    }

    /**
     * Set the app to calculate the rate limiter for.
     */
    forApp(app: App): RateLimiterDriver {
        this.app = app;

        return this;
    }

    /**
     * Set the socket to calculate the rate limiter for.
     */
    forSocket(socket: Socket): RateLimiterDriver {
        this.socket = socket;

        return this;
    }

    /**
     * Consume the points for backend-received events.
     */
    consumeBackendEventPoints(points: number): Promise<ConsumptionResponse> {
        this.rateLimiter.points = this.app.maxBackendEventsPerMinute as number;

        return this.consumeForKey(`backend:events:${this.app.id}`, points);
    }

    /**
     * Consume the points for frontend-received events.
     */
    consumeFrontendEventPoints(points: number): Promise<ConsumptionResponse> {
        this.rateLimiter.points = this.app.maxClientEventsPerMinute as number;

        return this.consumeForKey(`frontend:events:${this.socket.id}:${this.app.id}`, points);
    }

    /**
     * Consume the points for HTTP read requests.
     */
    consumeReadRequestsPoints(points: number): Promise<ConsumptionResponse> {
        this.rateLimiter.points = this.app.maxReadRequestsPerMinute as number;

        return this.consumeForKey(`backend:request_read:${this.app.id}`, points);
    }

    /**
     * Consume points for a given key, then
     * return a response object with headers and
     * the success indicator.
     */
    protected consumeForKey(key: string, points: number): Promise<ConsumptionResponse> {
        if (this.rateLimiter.points < 0) {
            return new Promise(resolve => resolve({ rateLimiterRes: null, headers: { } }));
        }

        return new Promise((resolve, reject) => {
            let calculateHeaders = (rateLimiterRes: RateLimiterRes) => ({
                'Retry-After': rateLimiterRes.msBeforeNext / 1000,
                'X-RateLimit-Limit': this.rateLimiter.points,
                'X-RateLimit-Remaining': rateLimiterRes.remainingPoints,
            });

            this.rateLimiter.consume(key, points).then((rateLimiterRes: RateLimiterRes) => {
                resolve({
                    rateLimiterRes,
                    headers: calculateHeaders(rateLimiterRes),
                });
            }).catch((rateLimiterRes: RateLimiterRes) => {
                reject({
                    rateLimiterRes,
                    headers: calculateHeaders(rateLimiterRes),
                });
            });
        });
    }
}
