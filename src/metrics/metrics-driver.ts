import * as prom from 'prom-client';
import { Request } from '../request';
import { Socket } from '../socket';

export interface MetricsDriver {
    /**
     * Handle a new connection.
     */
    markNewConnection(socket: Socket): void;

    /**
     * Handle a disconnection.
     */
    markDisconnection(socket: Socket): void;

    /**
     * Handle a new API message event being received and sent out.
     */
    markApiMessage(namespace: string, req: Request, ...responseData: any): void;

    /**
     * Handle a new WS client message event being received.
     */
    markWsMessage(namespace: string, event: string, ...data: any): void;

    /**
     * Get the stored metrics as plain text, if possible.
     */
    getMetricsAsPlaintext(): Promise<string>;

    /**
     * Get the stored metrics as JSON.
     */
    getMetricsAsJson(): Promise<prom.metric[]>;
}
