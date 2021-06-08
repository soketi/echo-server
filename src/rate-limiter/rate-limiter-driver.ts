import { App } from './../app';
import { RateLimiterRes } from 'rate-limiter-flexible';
import { Socket } from './../socket';

export interface RateLimiterDriver {
    /**
     * Consume the points for backend-received events.
     */
    consumeBackendEventPoints(points: number): Promise<ConsumptionResponse>;

    /**
     * Consume the points for frontend-received events.
     */
    consumeFrontendEventPoints(points: number): Promise<ConsumptionResponse>;

    /**
     * Consume the points for HTTP read requests.
     */
    consumeReadRequestsPoints(points: number): Promise<ConsumptionResponse>;

    /**
     * Set the app to calculate the rate limiter for.
     */
    forApp(app: App): RateLimiterDriver;

    /**
     * Set the socket to calculate the rate limiter for.
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
