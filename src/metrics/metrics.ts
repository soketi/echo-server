import * as prom from 'prom-client';
import { Log } from './../log';
import { MetricsDriver } from './metrics-driver';
import { Options } from '../options';
import { PrometheusMetricsDriver } from './prometheus-metrics-driver';
import { Request } from '../request';
import { Server as SocketIoServer } from 'socket.io';
import { Socket } from '../socket';
import { PushgatewayMetricsDriver } from './pushgateway-metrics-driver';

export class Metrics implements MetricsDriver {
    /**
     * The Metrics driver.
     */
    protected driver: MetricsDriver;

    /**
     * Initialize the Prometheus exporter.
     */
    constructor(protected io: SocketIoServer, protected options: Options) {
        if (options.metrics.driver === 'prometheus') {
            this.driver = new PrometheusMetricsDriver(io, options);
        } else if (options.metrics.driver === 'pushgateway') {
            this.driver = new PushgatewayMetricsDriver(io, options);
        } else {
            Log.error('No metrics driver specified.');
        }
    }

    /**
     * Handle a new connection.
     */
    markNewConnection(socket: Socket): void {
        return this.driver.markNewConnection(socket);
    }

    /**
     * Handle a disconnection.
     */
    markDisconnection(socket: Socket): void {
        return this.driver.markDisconnection(socket);
    }

    /**
     * Handle a new API message event being received and sent out.
     */
    markApiMessage(namespace: string, req: Request, ...responseData: any): void {
        return this.driver.markApiMessage(namespace, req, ...responseData);
    }

    /**
     * Handle a new WS client message event being received.
     */
    markWsMessage(namespace: string, event: string, ...data: any): void {
        return this.driver.markWsMessage(namespace, event, ...data);
    }

    /**
     * Get the stored metrics as plain text, if possible.
     */
    getMetricsAsPlaintext(): Promise<string> {
        return this.driver.getMetricsAsPlaintext();
    }

     /**
      * Get the stored metrics as JSON.
      */
    getMetricsAsJson(): Promise<prom.metric[]> {
        return this.driver.getMetricsAsJson();
    }
}
