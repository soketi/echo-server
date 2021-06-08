import * as prom from 'prom-client';
import { Options } from './options';
import { Request } from './request';
import { Socket } from './socket';
import { Server as SocketIoServer } from 'socket.io';
import { Utils } from './utils';

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

export class Prometheus {
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
     * @type {prom.register}
     */
    register: typeof prom.register;

    /**
     * Initialize the Prometheus exporter.
     *
     * @param {SocketIoServer} io
     * @param {Options} options
     */
    constructor(protected io: SocketIoServer, protected options: Options) {
        this.register = prom.register;

        prom.collectDefaultMetrics({
            prefix: options.prometheus.prefix,
            register: this.register,
            labels: {
                node_id: options.instance.node_id,
                pod_id: options.instance.pod_id,
            },
        });
    }

    /**
     * Handle a new connection.
     *
     * @param  {Socket}  socket
     * @return {void}
     */
    markNewConnection(socket: Socket): void {
        let namespace = socket.nsp.name;
        let nsp = this.io.of(namespace);

        this.metrics.connectedSockets.set({ namespace }, nsp.sockets.size);
        this.metrics.newConnectionsTotal.inc({ namespace });

        socket.onAny((event, ...args) => {
            this.metrics.clientToServerReceivedEventsTotal.inc({ namespace });
            this.metrics.socketBytesReceived.inc({ namespace }, Utils.dataToBytes(event, args));
            this.metrics.serverToClientSentEventsTotal.inc({ namespace });
        });
    }

    /**
     * Handle a disconnection.
     *
     * @param  {Socket}  socket
     * @return {void}
     */
    markDisconnection(socket: Socket): void {
        let namespace = socket.nsp.name;
        let nsp = this.io.of(namespace);

        this.metrics.connectedSockets.set({ namespace }, nsp.sockets.size);
        this.metrics.newDisconnectionsTotal.inc({ namespace });
    }

    /**
     * Handle a new API message event being received and sent out.
     *
     * @param  {string}  namespace
     * @param  {Request}  req
     * @param  {any}  responseData
     * @return {void}
     */
    markApiMessage(namespace: string, req: Request, ...responseData: any): void {
        this.metrics.httpBytesReceived.inc({ namespace }, req.socket.bytesRead);
        this.metrics.httpBytesTransmitted.inc({ namespace }, req.socket.bytesRead + Utils.dataToBytes(...responseData));
        this.metrics.httpCallsReceived.inc({ namespace });
    }

    /**
     * Handle a new WS client message event being received.
     *
     * @param  {string}  namespace
     * @param  {string}  event
     * @param  {any}  data
     * @return {void}
     */
    markWsMessage(namespace: string, event: string, ...data: any): void {
        this.metrics.socketBytesTransmitted.inc({ namespace }, Utils.dataToBytes(namespace, event, ...data));
    }
}
