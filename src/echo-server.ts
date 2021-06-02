import { AppManager } from './app-managers/app-manager';
import { Channel, EncryptedPrivateChannel, PresenceChannel, PrivateChannel } from './channels';
import { HttpApi } from './api';
import { Log } from './log';
import { Prometheus } from './prometheus';
import { RateLimiter } from './rate-limiter';
import { Server } from './server';
import { Stats } from './stats';
import { v4 as uuidv4 } from 'uuid';

const { constants } = require('crypto');
const dayjs = require('dayjs');

/**
 * Echo server class.
 */
export class EchoServer {
    /**
     * Default server options.
     *
     * @type {any}
     */
    public options: any = {
        appManager: {
            driver: 'array',
            api: {
                host: 'http://127.0.0.1',
                endpoint: '/echo-server/app',
                token: 'echo-app-token',
            },
            array: {
                apps: [
                    {
                        id: 'echo-app',
                        key: 'echo-app-key',
                        secret: 'echo-app-secret',
                        maxConnections: -1,
                        enableStats: false,
                        maxBackendEventsPerMinute: -1,
                        maxClientEventsPerMinute: -1,
                        maxReadRequestsPerMinute: -1,
                    },
                ],
            },
        },
        closingGracePeriod: 60,
        cors: {
            credentials: true,
            origin: ['*'],
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: [
                'Origin',
                'Content-Type',
                'X-Auth-Token',
                'X-Requested-With',
                'Accept',
                'Authorization',
                'X-CSRF-TOKEN',
                'XSRF-TOKEN',
                'X-Socket-Id',
            ],
        },
        database: {
            redis: {
                host: '127.0.0.1',
                port: 6379,
                password: null,
                keyPrefix: '',
            },
            redisTs: {
                host: '127.0.0.1',
                port: 6381,
                password: null,
                keyPrefix: '',
            },
            local: {
                //
            },
            prometheus: {
                host: '127.0.0.1',
                port: 9090,
                protocol: 'http',
            },
        },
        development: false,
        host: null,
        httpApi: {
            extraHeaders: [
                //
            ],
            payload: {
                payloadLimitInKb: 100,
                requestLimitInMb: 100,
            },
            protocol: 'http',
            trustProxies: false,
        },
        instance: {
            node_id: null,
            process_id: process.pid || uuidv4(),
            pod_id: null,
        },
        port: 6001,
        presence: {
            storage: {
                database: 'socket',
            },
            maxMembersPerChannel: 100,
            maxMemberSizeInKb: 2,
        },
        prometheus: {
            enabled: false,
            prefix: 'echo_server_',
        },
        rateLimiter: {
            driver: 'local',
        },
        replication: {
            driver: 'local',
        },
        secureOptions: constants.SSL_OP_NO_TLSv1,
        socketIoOptions: {
            //
        },
        ssl: {
            certPath: '',
            keyPath: '',
            caPath: '',
            passphrase: '',
        },
        stats: {
            enabled: true,
            driver: 'local',
            snapshots: {
                interval: 60 * 60,
            },
            retention: {
                period: 7 * 24 * 60 * 60, // 7 days
            },
        },
    };

    /**
     * Socket.io server instance.
     *
     * @type {Server}
     */
    protected server: Server;

    /**
     * Public channel instance.
     *
     * @type {Channel}
     */
    protected publicChannel: Channel;

    /**
     * Private channel instance.
     *
     * @type {PrivateChannel}
     */
    protected privateChannel: PrivateChannel;

    /**
     * Encrypted private channel instance.
     *
     * @type {PrivateChannel}
     */
     protected encryptedPrivateChannel: EncryptedPrivateChannel;

    /**
     * Presence channel instance.
     *
     * @type {PresenceChannel}
     */
    protected presenceChannel: PresenceChannel;

    /**
     * The HTTP API instance.
     *
     * @type {HttpApi}
     */
    protected httpApi: HttpApi;

    /**
     * The app manager used for client authentication.
     *
     * @type {AppManager}
     */
    protected appManager: AppManager;

    /**
     * The Prometheus client that handles export.
     *
     * @type {Prometheus}
     */
    protected prometheus: Prometheus;

     /**
     * The RateLimiter client.
     *
     * @type {RateLimiter}
     */
    protected rateLimiter: RateLimiter;

    /**
     * Let the server know to reject any new connections.
     *
     * @type {boolean}
     */
    rejectNewConnections = false;

    /**
     * Let the plugins know if the server is closing.
     *
     * @type {boolean}
     */
    closing = false;

    /**
     * The stats manager that will be used to store stats.
     *
     * @type {Stats}
     */
    protected stats: Stats;

    /**
     * Create a new Echo Server instance.
     */
    constructor() {
        //
    }

    /**
     * Start the Echo Server.
     *
     * @param  {any}  options
     * @return {Promise<any>}
     */
    start(options: any = {}): Promise<any> {
        return new Promise((resolve, reject) => {
            this.options = {
                ...Object.assign(this.options, options),
                ...{
                    closingGracePeriod: ['local', 'prometheus'].includes(this.options.stats.driver) ? 1 : this.options.closingGracePeriod,
                },
            };

            this.server = new Server(this.options);

            if (this.options.development) {
                Log.warning('Starting the server in development mode...\n');
            } else {
                Log.info('Starting the server...\n')
            }

            this.server.initialize().then(io => {
                this.initialize(io).then(() => {
                    this.rejectNewConnections = false;
                    this.closing = false;

                    Log.info('\nServer ready!\n');

                    if (this.options.development) {
                        Log.info({ options: JSON.stringify(this.options) });
                    }

                    resolve(this);
                }, error => Log.error(error));
            }, error => Log.error(error));
        });
    }

    /**
     * Initialize the websockets server.
     *
     * @param  {any}  io
     * @return {Promise<void>}
     */
    initialize(io: any): Promise<void> {
        return new Promise((resolve, reject) => {
            this.appManager = new AppManager(this.options);
            this.stats = new Stats(this.options);
            this.prometheus = new Prometheus(io, this.options);
            this.rateLimiter = new RateLimiter(this.options);

            this.publicChannel = new Channel(io, this.stats, this.prometheus, this.rateLimiter, this.options);
            this.privateChannel = new PrivateChannel(io, this.stats, this.prometheus, this.rateLimiter, this.options);
            this.encryptedPrivateChannel = new EncryptedPrivateChannel(io, this.stats, this.prometheus, this.rateLimiter, this.options);
            this.presenceChannel = new PresenceChannel(io, this.stats, this.prometheus, this.rateLimiter, this.options);

            this.httpApi = new HttpApi(
                this,
                io,
                this.server.express,
                this.options,
                this.appManager,
                this.stats,
                this.prometheus,
                this.rateLimiter,
            );

            this.httpApi.initialize();

            let nsp = this.server.io.of(/.*/);

            this.registerSocketMiddleware(nsp);
            this.registerConnectionCallbacks(nsp);
            this.registerStatsSnapshotter();

            resolve();
        });
    }

    /**
     * Stop the echo server.
     *
     * @return {Promise<void>}
     */
    async stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            Log.warning('Stopping the server...');

            this.rejectNewConnections = true;
            this.closing = true;

            this.server.io.close(async () => {
                /**
                 * There is a timeout set to resolve the promise later
                 * since (in odd ways???) sync actions like disconnecting
                 * all sockets and decrementing the current connections count in stats
                 * do not finish for sync clients like Redis.
                 *
                 * So in order to do that, the server close should wait for
                 * a while before closing it, hence naming his timeout as "grace period"
                 * to resolve all socket.on() actions.
                 */
                await setTimeout(() => resolve(), this.options.closingGracePeriod * 1000);
            });
        });
    }

    /**
     * Extract the namespace from socket.
     *
     * @param  {any}  socket
     * @return {string}
     */
    getNspForSocket(socket: any): string {
        return socket.nsp.name;
    }

    /**
     * Get the App Key from the socket connection.
     *
     * @param  {any}  socket
     * @return {string|undefined}
     */
    protected getAppKey(socket: any): string|undefined {
        return this.getNspForSocket(socket).replace(/^\//g, ''); // remove the starting slash
    }

    /**
     * Register the Socket.IO middleware.
     *
     * @param  {any}  nsp
     * @return {void}
     */
    protected registerSocketMiddleware(nsp: any): void {
        nsp.use((socket, next) => {
            socket.id = this.generateSocketId();

            this.checkIfSocketHasValidEchoApp(socket).then(socket => {
                next();
            }, error => {
                next(error);
            });
        });
    }

    /**
     * Register callbacks for on('connection') events.
     *
     * @param  {any}  nsp
     * @return {void}
     */
    protected registerConnectionCallbacks(nsp: any): void {
        nsp.on('connection', socket => {
            this.stats.markNewConnection(socket.data.echoApp);

            if (this.options.prometheus.enabled) {
                this.prometheus.markNewConnection(socket);
            }

            if (this.rejectNewConnections || this.closing) {
                return socket.disconnect();
            }

            this.checkIfSocketDidNotReachedLimit(socket).then(socket => {
                this.onSubscribe(socket);
                this.onUnsubscribe(socket);
                this.onDisconnecting(socket);
                this.onClientEvent(socket);
            }, error => {
                socket.disconnect();
            });
        });
    }

    /**
     * Register the stats snapshotter for all namespaces.
     *
     * @return {void}
     */
    protected registerStatsSnapshotter(): void {
        if (this.options.stats.enabled) {
            setInterval(() => {
                let time = dayjs().unix();

                this.stats.getRegisteredApps().then(apps => {
                    apps.forEach(name => {
                        if (this.options.development) {
                            Log.info({
                                time,
                                nsp: name,
                                action: 'taking_snapshot',
                            });
                        }

                        let appKey = name.replace(/^\//g, '');

                        this.stats.takeSnapshot(appKey, time).then(() => {
                            this.stats.deleteStalePoints(appKey, time);
                        });
                    });
                });
            }, this.options.stats.snapshots.interval * 1000);
        }
    }

    /**
     * Handle subscriptions to a channel.
     *
     * @param  {any}  socket
     * @return {void}
     */
    protected onSubscribe(socket: any): void {
        socket.on('subscribe', data => {
            this.getChannelInstance(data.channel).join(socket, data);
        });
    }

    /**
     * Handle unsubscribes from a channel.
     *
     * @param  {any}  socket
     * @return {void}
     */
    protected onUnsubscribe(socket: any): void {
        socket.on('unsubscribe', data => {
            this.getChannelInstance(data.channel).leave(socket, data.channel, 'unsubscribed');
        });
    }

    /**
     * Handle socket disconnection.
     *
     * @param  {any}  socket
     * @return {void}
     */
    protected onDisconnecting(socket: any): void {
        /**
         * Make sure to store this before using stats.
         */
        let rooms = socket.rooms;

        socket.on('disconnecting', reason => {
            this.stats.markDisconnection(socket.data.echoApp, reason).then(() => {
                rooms.forEach(room => {
                    // Each socket has a list of channels defined by us and his own channel
                    // that has the same name as their unique socket ID. We don't want it to
                    // be disconnected from that one and instead disconnect it from our defined channels.
                    if (room !== socket.id) {
                        this.getChannelInstance(room).leave(socket, room, reason);
                    }
                });
            });
        });

        socket.on('disconnect', reason => {
            if (this.options.prometheus.enabled) {
                this.prometheus.markDisconnection(socket);
            }
        });
    }

    /**
     * Handle client events.
     *
     * @param  {any}  socket
     * @return {void}
     */
    protected onClientEvent(socket: any): void {
        socket.on('client event', data => {
            this.getChannelInstance(data.channel).onClientEvent(socket, data);
        });
    }

    /**
     * Get the channel instance for a channel name.
     *
     * @param  {string}  channel
     * @return {Channel|PrivateChannel|EncryptedPrivateChannel|PresenceChannel}
     */
    getChannelInstance(channel): Channel|PrivateChannel|EncryptedPrivateChannel|PresenceChannel {
        if (Channel.isPresenceChannel(channel)) {
            return this.presenceChannel;
        } else if (Channel.isEncryptedPrivateChannel(channel)) {
            return this.encryptedPrivateChannel;
        } else if (Channel.isPrivateChannel(channel)) {
            return this.privateChannel;
        } else {
            return this.publicChannel;
        }
    }

    /**
     * Make sure if the socket connected
     * to a valid echo app.
     *
     * @param  {any}  socket
     * @return {Promise<any>}
     */
    protected checkIfSocketHasValidEchoApp(socket: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (socket.data.echoApp) {
                return resolve(socket);
            }

            let appKey = this.getAppKey(socket);

            this.appManager.findByKey(appKey, socket, {}).then(app => {
                if (!app) {
                    if (this.options.development) {
                        Log.error({
                            time: new Date().toISOString(),
                            socketId: socket ? socket.id : null,
                            action: 'app_check',
                            status: 'failed',
                        });
                    }

                    socket.emit('socket:error', { message: 'The app trying to reach does not exist.', code: 4001 });

                    reject({ reason: `The app ${appKey} does not exist` });
                } else {
                    socket.data.echoApp = app;
                    resolve(socket);
                }
            }, error => {
                if (this.options.development) {
                    Log.error({
                        time: new Date().toISOString(),
                        socketId: socket ? socket.id : null,
                        action: 'find_app',
                        status: 'failed',
                        error,
                    });
                }

                socket.emit('socket:error', { message: 'There is an internal problem.', code: 4001 });

                reject(error);
            });
        });
    }

    /**
     * Make sure the socket connection did not
     * reach the app limit.
     *
     * @param  {any}  socket
     * @return {Promise<any>}
     */
    protected checkIfSocketDidNotReachedLimit(socket: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (socket.disconnected || !socket.data.echoApp) {
                if (this.options.development) {
                    Log.error({
                        time: new Date().toISOString(),
                        socketId: socket ? socket.id : null,
                        action: 'max_connections_check',
                        status: 'failed',
                        reason: 'disconnected or not valid app',
                        reached: false,
                    });
                }

                socket.emit('socket:error', { message: 'There is an internal problem.', code: 4004 });

                return reject({ reason: 'The app connection limit cannot be checked because the socket is not authenticated.' });
            }

            this.server.io.of(this.getNspForSocket(socket)).allSockets().then(clients => {
                let maxConnections = parseInt(socket.data.echoApp.maxConnections) || -1;

                if (maxConnections < 0) {
                    return resolve(socket);
                }

                if (maxConnections >= clients.size) {
                    resolve(socket);
                } else {
                    if (this.options.development) {
                        Log.error({
                            time: new Date().toISOString(),
                            socketId: socket ? socket.id : null,
                            action: 'max_connections_check',
                            status: 'failed',
                            reached: true,
                        });
                    }

                    socket.emit('socket:error', { message: 'The app has reached the connection quota.', code: 4100 });

                    reject({ reason: 'The current app reached connections limit.' });
                }
            }, error => {
                Log.error(error);

                socket.emit('socket:error', { message: 'There is an internal problem.', code: 4302 });

                reject(error);
            });
        });
    }

    /**
     * Generate a Pusher-like socket id.
     *
     * @return {string}
     */
    protected generateSocketId(): string {
        let min = 0;
        let max = 10000000000;

        let randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

        return randomNumber(min, max) + '.' + randomNumber(min, max);
    }
}
