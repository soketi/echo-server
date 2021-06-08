import * as prom from 'prom-client';
import { MetricsDriver } from './metrics-driver';
import { Options } from './../options';
import { Request } from './../request';
import { Server as SocketIoServer } from 'socket.io';
import { Socket } from './../socket';
import { Utils } from './../utils';

interface PrometheusMetrics {
    connectedSockets: prom.Gauge<'namespace'|'node_id'|'pod_id'>;
    newConnectionsTotal: prom.Counter<'namespace'|'node_id'|'pod_id'>;
    newDisconnectionsTotal: prom.Counter<'namespace'|'node_id'|'pod_id'>;
    clientToServerReceivedEventsTotal: prom.Counter<'namespace'|'node_id'|'pod_id'>;
    serverToClientSentEventsTotal: prom.Counter<'namespace'|'node_id'|'pod_id'>;
    socketBytesReceived: prom.Counter<'namespace'|'node_id'|'pod_id'>;
    socketBytesTransmitted: prom.Counter<'namespace'|'node_id'|'pod_id'>;
    httpBytesReceived: prom.Counter<'namespace'|'node_id'|'pod_id'>;
    httpBytesTransmitted: prom.Counter<'namespace'|'node_id'|'pod_id'>;
    httpCallsReceived: prom.Counter<'namespace'|'node_id'|'pod_id'>;
}

interface InfraMetadata {
    [key: string]: any;
}

interface NamespaceTags {
    namespace: string;
    [key: string]: any;
}

export class PrometheusMetricsDriver implements MetricsDriver {
    /**
     * The list of metrics that will register.
     *
     * @type {PrometheusMetrics}
     */
    protected metrics: PrometheusMetrics = {
        connectedSockets: new prom.Gauge({
            name: 'socket_io_connected',
            help: 'The number of currently connected sockets.',
            labelNames: ['namespace', 'node_id', 'pod_id'],
        }),
        newConnectionsTotal: new prom.Counter({
            name: 'socket_io_new_connections_total',
            help: 'Total amount of Socket.IO connection requests.',
            labelNames: ['namespace', 'node_id', 'pod_id'],
        }),
        newDisconnectionsTotal: new prom.Counter({
            name: 'socket_io_new_disconnections_total',
            help: 'Total amount of Socket.IO disconnections.',
            labelNames: ['namespace', 'node_id', 'pod_id'],
        }),
        clientToServerReceivedEventsTotal: new prom.Counter({
            name: 'socket_io_server_events_received_total',
            help: 'Total events received from the Socket.IO client.',
            labelNames: ['namespace', 'node_id', 'pod_id'],
        }),
        serverToClientSentEventsTotal: new prom.Counter({
            name: 'socket_io_server_to_client_events_sent_total',
            help: 'Total amount of sent events by Socket.IO.',
            labelNames: ['namespace', 'node_id', 'pod_id'],
        }),
        socketBytesReceived: new prom.Counter({
            name: 'socket_io_socket_received_bytes',
            help: 'Total amount of bytes that Socket.IO received.',
            labelNames: ['namespace', 'node_id', 'pod_id'],
        }),
        socketBytesTransmitted: new prom.Counter({
            name: 'socket_io_socket_transmitted_bytes',
            help: 'Total amount of bytes that Socket.IO transmitted.',
            labelNames: ['namespace', 'node_id', 'pod_id'],
        }),
        httpBytesReceived: new prom.Counter({
            name: 'socket_io_http_received_bytes',
            help: 'Total amount of bytes that Socket.IO\'s REST API received.',
            labelNames: ['namespace', 'node_id', 'pod_id'],
        }),
        httpBytesTransmitted: new prom.Counter({
            name: 'socket_io_http_transmitted_bytes',
            help: 'Total amount of bytes that Socket.IO\'s REST API sent back.',
            labelNames: ['namespace', 'node_id', 'pod_id'],
        }),
        httpCallsReceived: new prom.Counter({
            name: 'socket_io_http_events_received_total',
            help: 'Total amount of received REST API calls.',
            labelNames: ['namespace', 'node_id', 'pod_id'],
        }),
    };

    /**
     * Prometheus register repo.
     *
     * @type {prom.Registry}
     */
    register: prom.Registry;

    /**
     * The infra-related metadata.
     *
     * @type {InfraMetadata}
     */
    protected infraMetadata: InfraMetadata = {
        //
    };

    /**
     * Initialize the Prometheus exporter.
     */
    constructor(protected io: SocketIoServer, protected options: Options) {
        this.register = new prom.Registry();

        this.infraMetadata = {
            node_id: options.instance.node_id,
            pod_id: options.instance.pod_id,
        };

        prom.collectDefaultMetrics({
            prefix: options.prometheus.prefix,
            register: this.register,
            labels: this.infraMetadata,
        });
    }

    /**
     * Handle a new connection.
     */
    markNewConnection(socket: Socket): void {
        let namespace = socket.nsp.name;
        let nsp = this.io.of(namespace);

        this.metrics.connectedSockets.set(this.getTags(namespace), nsp.sockets.size);
        this.metrics.newConnectionsTotal.inc(this.getTags(namespace));

        socket.onAny((event, ...args) => {
            this.metrics.clientToServerReceivedEventsTotal.inc(this.getTags(namespace));
            this.metrics.socketBytesReceived.inc(this.getTags(namespace), Utils.dataToBytes(event, args));
            this.metrics.serverToClientSentEventsTotal.inc(this.getTags(namespace));
        });
    }

    /**
     * Handle a disconnection.
     */
    markDisconnection(socket: Socket): void {
        let namespace = socket.nsp.name;
        let nsp = this.io.of(namespace);

        this.metrics.connectedSockets.set(this.getTags(namespace), nsp.sockets.size);
        this.metrics.newDisconnectionsTotal.inc(this.getTags(namespace));
    }

    /**
     * Handle a new API message event being received and sent out.
     */
    markApiMessage(namespace: string, req: Request, ...responseData: any): void {
        this.metrics.httpBytesReceived.inc(this.getTags(namespace), req.socket.bytesRead);
        this.metrics.httpBytesTransmitted.inc(this.getTags(namespace), req.socket.bytesRead + Utils.dataToBytes(...responseData));
        this.metrics.httpCallsReceived.inc(this.getTags(namespace));
    }

    /**
     * Handle a new WS client message event being received.
     */
    markWsMessage(namespace: string, event: string, ...data: any): void {
        this.metrics.socketBytesTransmitted.inc(this.getTags(namespace), Utils.dataToBytes(namespace, event, ...data));
    }

    /**
     * Get the stored metrics as plain text, if possible.
     */
    getMetricsAsPlaintext(): Promise<string> {
        return this.register.metrics();
    }

     /**
      * Get the stored metrics as JSON.
      */
    getMetricsAsJson(): Promise<prom.metric[]> {
        return this.register.getMetricsAsJSON();
    }

    /**
     * Get the tags for Prometheus.
     */
    protected getTags(namespace: string): NamespaceTags {
        return {
            namespace,
            ...this.infraMetadata,
        };
    }
}
