import { App } from './../app';

export interface RateLimiterDriver {
    /**
     * Consume the points for backend-received events.
     *
     * @param  {number}  points
     * @return {Promise<any>}
     */
    consumeBackendEventPoints(points: number): Promise<any>;

    /**
     * Consume the points for frontend-received events.
     *
     * @param  {number}  points
     * @return {Promise<any>}
     */
    consumeFrontendEventPoints(points: number): Promise<any>;

    /**
     * Consume the points for HTTP read requests.
     *
     * @param  {number}  points
     * @return {Promise<any>}
     */
    consumeReadRequestsPoints(points: number): Promise<any>;

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
     * @param  {any}  socket
     * @return {RateLimiterDriver}
     */
    forSocket(socket: any): RateLimiterDriver;
}
