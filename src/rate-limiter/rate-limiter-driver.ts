import { App } from './../app';
import { RateLimiterRes } from 'rate-limiter-flexible';
import { Socket } from './../socket';

export interface RateLimiterDriver {
    /**
     * Consume the points for backend-received events.
     *
     * @param  {number}  points
     * @return {Promise<ConsumptionResponse>}
     */
    consumeBackendEventPoints(points: number): Promise<ConsumptionResponse>;

    /**
     * Consume the points for frontend-received events.
     *
     * @param  {number}  points
     * @return {Promise<ConsumptionResponse>}
     */
    consumeFrontendEventPoints(points: number): Promise<ConsumptionResponse>;

    /**
     * Consume the points for HTTP read requests.
     *
     * @param  {number}  points
     * @return {Promise<ConsumptionResponse>}
     */
    consumeReadRequestsPoints(points: number): Promise<ConsumptionResponse>;

    /**
     * Set the app to calculate the rate limiter for.
     *
     * @param  {App}  app
     * @return {RateLimiterDriver}
     */
    forApp(app: App): RateLimiterDriver;

    /**
     * Set the socket to calculate the rate limiter for.
     *
     * @param  {Socket}  socket
     * @return {RateLimiterDriver}
     */
    forSocket(socket: Socket): RateLimiterDriver;
}

export interface ConsumptionResponse {
    rateLimiterRes: RateLimiterRes|null;
    headers: {
        'Retry-After'?: number;
        'X-RateLimit-Limit'?: number;
        'X-RateLimit-Remaining'?: number;
    };
}
