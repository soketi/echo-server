import * as prom from 'prom-client';
import { Options } from '../options';
import { PrometheusMetricsDriver } from './prometheus-metrics-driver';
import { Request } from '../request';
import { Server as SocketIoServer } from 'socket.io';
import { Socket } from '../socket';

const http = require('http');

export class PushgatewayMetricsDriver extends PrometheusMetricsDriver {
    /**
     * The Pushgateway client.
     *
     * @type {prom.Pushgateway}
     */
    protected pushgateway: prom.Pushgateway;

    /**
     * Initialize the Pushgateway exporter.
     */
    constructor(protected io: SocketIoServer, protected options: Options) {
        super(io, options);

        let { host, port, protocol } = this.options.database.pushgateway;

        this.pushgateway = new prom.Pushgateway(`${protocol}://${host}:${port}`, {
            agent: new http.Agent({
                keepAlive: true,
                keepAliveMsec: 10000,
                maxSockets: 5,
            }),
        });
    }

    /**
     * Handle a new connection.
     */
    markNewConnection(socket: Socket): void {
        super.markNewConnection(socket);
    }

    /**
     * Handle a disconnection.
     */
    markDisconnection(socket: Socket): void {
        super.markDisconnection(socket);
    }

    /**
     * Handle a new API message event being received and sent out.
     */
    markApiMessage(namespace: string, req: Request, ...responseData: any): void {
        super.markApiMessage(namespace, req, ...responseData);
    }

    /**
     * Handle a new WS client message event being received.
     */
    markWsMessage(namespace: string, event: string, ...data: any): void {
        super.markWsMessage(namespace, event, ...data);
    }
}
