import * as prom from 'prom-client';

export class Prometheus {
    /**
     * The list of metrics that will register.
     *
     * @type {any}
     */
    protected metrics: any = {
        connectedSockets: new prom.Gauge({
            name: 'socket_io_connected',
            help: 'The number of currently connected sockets.',
            labelNames: ['namespace'],
        }),
        newConnectionsTotal: new prom.Counter({
            name: 'socket_io_new_connections_total',
            help: 'Total amount of Socket.IO connection requests.',
            labelNames: ['namespace'],
        }),
        newDisconnectionsTotal: new prom.Counter({
            name: 'socket_io_new_disconnections_total',
            help: 'Total amount of Socket.IO disconnections.',
            labelNames: ['namespace'],
        }),
        clientToServerReceivedEventsTotal: new prom.Counter({
            name: 'socket_io_server_events_received_total',
            help: 'Total events received from the Socket.IO client.',
            labelNames: ['namespace'],
        }),
        serverToClientSentEventsTotal: new prom.Counter({
            name: 'socket_io_server_to_client_events_sent_total',
            help: 'Total amount of sent events by Socket.IO.',
            labelNames: ['namespace'],
        }),
        socketBytesReceived: new prom.Counter({
            name: 'socket_io_socket_received_bytes',
            help: 'Total amount of bytes that Socket.IO received.',
            labelNames: ['namespace'],
        }),
        socketBytesTransmitted: new prom.Counter({
            name: 'socket_io_socket_transmitted_bytes',
            help: 'Total amount of bytes that Socket.IO transmitted.',
            labelNames: ['namespace'],
        }),
        httpBytesReceived: new prom.Counter({
            name: 'socket_io_http_received_bytes',
            help: 'Total amount of bytes that Socket.IO\'s REST API received.',
            labelNames: ['namespace'],
        }),
        httpBytesTransmitted: new prom.Counter({
            name: 'socket_io_http_transmitted_bytes',
            help: 'Total amount of bytes that Socket.IO\'s REST API sent back.',
            labelNames: ['namespace'],
        }),
        httpCallsReceived: new prom.Counter({
            name: 'socket_io_http_events_received_total',
            help: 'Total amount of received REST API calls.',
            labelNames: ['namespace'],
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
     * @param {any} io
     * @param {any} options
     */
    constructor(protected io: any, protected options: any) {
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
     * @param  {any}  socket
     * @return {void}
     */
    markNewConnection(socket: any): void {
        let namespace = socket.nsp.name;
        let nsp = this.io.of(namespace);

        this.metrics.connectedSockets.set({ namespace }, nsp.sockets.size);
        this.metrics.newConnectionsTotal.inc({ namespace });

        socket.onAny((event, ...args) => {
            this.metrics.clientToServerReceivedEventsTotal.inc({ namespace });
            this.metrics.socketBytesReceived.inc({ namespace }, this.dataToBytes(event, args));
            this.metrics.serverToClientSentEventsTotal.inc({ namespace });
        });
    }

    /**
     * Handle a disconnection.
     *
     * @param  {any}  socket
     * @return {void}
     */
    markDisconnection(socket: any): void {
        let namespace = socket.nsp.name;
        let nsp = this.io.of(namespace);

        this.metrics.connectedSockets.set({ namespace }, nsp.sockets.size);
        this.metrics.newDisconnectionsTotal.inc({ namespace });
    }

    /**
     * Handle a new API message event being received and sent out.
     *
     * @param  {string}  namespace
     * @param  {any}  req
     * @param  {any}  responseData
     * @return {void}
     */
    markApiMessage(namespace: string, req: any, ...responseData: any): void {
        this.metrics.httpBytesReceived.inc({ namespace }, req.socket.bytesRead);
        this.metrics.httpBytesTransmitted.inc({ namespace }, req.socket.bytesRead + this.dataToBytes(...responseData));
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
        this.metrics.socketBytesTransmitted.inc({ namespace }, this.dataToBytes(namespace, event, ...data));
    }

    /**
     * Get the amount of bytes from given parameters.
     *
     * @param  {any}  data
     * @return {number}
     */
    protected dataToBytes(...data: any): number {
        return data.reduce((totalBytes, element) => {
            element = typeof element === 'string' ? element : JSON.stringify(element);

            try {
                return totalBytes += Buffer.byteLength(element, 'utf8');
            } catch (e) {
                return totalBytes;
            }
        }, 0);
    }
}
