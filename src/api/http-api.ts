import { App } from './../app';
import { Application, Response } from 'express';
import { AppManager } from './../app-managers';
import { EchoServer } from '../echo-server';
import { Log } from './../log';
import { Options } from './../options';
import { PresenceChannel } from './../channels/presence-channel';
import { Prometheus } from './../prometheus';
import { RateLimiter } from '../rate-limiter';
import { RemoteSocket } from '../socket';
import { Request } from './../request';
import { Server as SocketIoServer } from 'socket.io';
import { Stats } from './../stats';
import { Utils } from '../utils';

const bodyParser = require('body-parser');
const dayjs = require('dayjs');
const pusherUtil = require('pusher/lib/util');
const Pusher = require('pusher');
const url = require('url');
const v8 = require('v8');

export class HttpApi {
    /**
     * Create new instance of HTTP API.
     *
     * @param {EchoServer} server
     * @param {SocketIoServer} io
     * @param {Application} express
     * @param {Options} options
     * @param {AppManager} appManager
     * @param {Stats} stats
     * @param {Prometheus} prometheus
     */
    constructor(
        protected server: EchoServer,
        protected io: SocketIoServer,
        protected express: Application,
        protected options: Options,
        protected appManager: AppManager,
        protected stats: Stats,
        protected prometheus: Prometheus,
        protected rateLimiter: RateLimiter,
    ) {
        //
    }

    /**
     * Initialize the HTTP API.
     *
     * @return {void}
     */
    initialize(): void {
        this.registerCorsMiddleware();
        this.configureHeaders();
        this.configureJsonBody();
        this.configureAppAttachmentToRequest();
        this.configurePusherAuthentication();

        this.express.get('/', (req: Request, res: Response) => this.getHealth(req, res));
        this.express.get('/health', (req: Request, res: Response) => this.getHealth(req, res));
        this.express.get('/ready', (req: Request, res: Response) => this.getReadiness(req, res));
        this.express.get('/usage', (req: Request, res: Response) => this.getUsage(req, res));

        let readRateLimiter = (req: Request, res: Response, next) => this.readRateLimiter(req, res, next);
        let broadcastEventRateLimiter = (req: Request, res: Response, next) => this.broadcastEventRateLimiter(req, res, next);

        this.express.get('/apps/:appId/channels', readRateLimiter, (req: Request, res: Response) => this.getChannels(req, res));
        this.express.get('/apps/:appId/channels/:channelName', readRateLimiter, (req: Request, res: Response) => this.getChannel(req, res));
        this.express.get('/apps/:appId/channels/:channelName/users', readRateLimiter, (req: Request, res: Response) => this.getChannelUsers(req, res));
        this.express.post('/apps/:appId/events', broadcastEventRateLimiter, (req: Request, res: Response) => this.broadcastEvent(req, res));

        if (this.options.stats.enabled) {
            this.express.get('/apps/:appId/stats', readRateLimiter, (req: Request, res: Response) => this.getStats(req, res));
            this.express.get('/apps/:appId/stats/current', readRateLimiter, (req: Request, res: Response) => this.getCurrentStats(req, res));
        }

        if (this.options.prometheus.enabled) {
            this.express.get('/metrics', (req: Request, res: Response) => this.getPrometheusMetrics(req, res));
        }
    }

    /**
     * Add CORS middleware if applicable.
     *
     * @return {void}
     */
    protected registerCorsMiddleware(): void {
        this.express.use((req: Request, res: Response, next) => {
            res.header('Access-Control-Allow-Origin', this.options.cors.origin.join(', '));
            res.header('Access-Control-Allow-Methods', this.options.cors.methods.join(', '));
            res.header('Access-Control-Allow-Headers', this.options.cors.allowedHeaders.join(', '));

            next();
        });
    }

    /**
     * Configure the headers from the settings.
     *
     * @return {void}
     */
    protected configureHeaders(): void {
        if (this.options.httpApi.trustProxies) {
            this.express.set('trust proxy', 1);
        }

        this.express.use((req: Request, res: Response, next) => {
            for (let header in this.options.httpApi.extraHeaders) {
                res.setHeader(header, this.options.httpApi.extraHeaders[header]);
            }

            next();
        });
    }

    /**
     * Configure the JSON body parser.
     *
     * @return {void}
     */
    protected configureJsonBody(): void {
        this.express.use(bodyParser.json({
            strict: true,
            limit: `${this.options.httpApi.requestLimitInMb}mb`,
            verify: (req: Request, res: Response, buffer) => {
                req.rawBody = buffer.toString();
            },
        }));
    }

    /**
     * Attach the App instance to the request object.
     *
     * @return {void}
     */
    protected configureAppAttachmentToRequest(): void {
        this.express.use('/apps/*', (req: Request, res: Response, next) => {
            let socketData = {
                auth: {
                    headers: req.headers,
                },
            };

            let appId = this.getAppId(req);
            let appKey = this.getAppKey(req);

            let promise = appId
                ? this.appManager.findById(appId, null, socketData)
                : this.appManager.findByKey(appKey, null, socketData);

            promise.then((app: App) => {
                req.echoApp = app;
                next();
            }, error => {
                if (this.options.development) {
                    Log.error({
                        time: new Date().toISOString(),
                        action: 'find_app',
                        status: 'failed',
                        error,
                    });
                }

                this.notFoundResponse(req, res);
            });
        });
    }

    /**
     * Attach global protection to HTTP routes, to verify the API key.
     *
     * @return {void}
     */
    protected configurePusherAuthentication(): void {
        this.express.param('appId', (req: Request, res: Response, next) => {
            this.signatureIsValid(req, res).then(() => {
                next();
            }, error => {
                this.unauthorizedResponse(req, res);
            });
        });
    }

    /**
     * Create a rate limiter for the /events endpoint.
     *
     * @param  {Request}  req
     * @param  {Response}  res
     * @param  {function}  next
     * @return {void}
     */
    protected broadcastEventRateLimiter(req: Request, res: Response, next): void {
        let app = req.echoApp;

        if (app.maxBackendEventsPerMinute < 0) {
            return next();
        }

        let channels = req.body.channels || [req.body.channel];

        this.rateLimiter.forApp(app).consumeBackendEventPoints(channels.length).then(rateLimitData => {
            for (let header in rateLimitData.headers) {
                res.setHeader(header, rateLimitData.headers[header]);
            }

            next();
        }, error => {
            this.tooManyRequestsResponse(req, res);
        });
    }

    /**
     * Create a rate limiter for any read-only endpoint.
     *
     * @param  {Request}  req
     * @param  {Response}  res
     * @param  {function}  next
     * @return {void}
     */
    protected readRateLimiter(req: Request, res: Response, next): void {
        let app = req.echoApp;

        this.rateLimiter.forApp(app).consumeReadRequestsPoints(1).then(rateLimitData => {
            for (let header in rateLimitData.headers) {
                res.header(header, rateLimitData.headers[header]);
            }

            next();
        }, error => {
            return this.tooManyRequestsResponse(req, res);
        });
    }

    /**
     * Outputs a simple message to show that the server is running.
     *
     * @param  {Request}  req
     * @param  {Response}  res
     * @return {void}
     */
    protected getHealth(req: Request, res: Response): void {
        res.send('OK');
    }

    /**
     * Outputs a simple message to check if the server accepts new connections.
     *
     * @param  {Request}  req
     * @param  {Response}  res
     * @return {void}
     */
    protected getReadiness(req: Request, res: Response): void {
        if (this.server.closing) {
            this.serviceUnavailableResponse(req, res);
        } else {
            res.send('OK');
        }
    }

    /**
     * Get details regarding the process usage.
     *
     * @param  {Request}  req
     * @param  {Response}  res
     * @return {void}
     */
    protected getUsage(req: Request, res: Response): void {
        let { rss, heapTotal, external, arrayBuffers } = process.memoryUsage();

        let totalSize = v8.getHeapStatistics().total_available_size;
        let usedSize = rss + heapTotal + external + arrayBuffers;
        let freeSize = totalSize - usedSize;
        let percentUsage = (usedSize / totalSize) * 100;

        res.json({
            memory: {
                free: freeSize,
                used: usedSize,
                total: totalSize,
                percent: percentUsage,
            },
        });
    }

    /**
     * Get a list of the open channels on the server.
     *
     * @param  {Request}  req
     * @param  {Response}  res
     * @return {void}
     */
    protected getChannels(req: Request, res: Response): void {
        let appKey = req.echoApp.key;
        let prefix = url.parse(req.url, true).query.filter_by_prefix;
        let rooms = this.io.of(`/${appKey}`).adapter.rooms;
        let channels = {};

        rooms.forEach((sockets, channelName) => {
            if (sockets.size === 0) {
                return;
            }

            if (prefix && !channelName.startsWith(prefix)) {
                return;
            }

            channels[channelName] = {
                subscription_count: sockets.size,
                occupied: true
            };
        }, []);

        res.json({ channels: channels });
    }

    /**
     * Get a information about a channel.
     *
     * @param  {Request}  req
     * @param  {Response}  res
     * @return {void}
     */
    protected getChannel(req: Request, res: Response): void {
        let appKey = req.echoApp.key;
        let channelName = req.params.channelName;
        let room = this.io.of(`/${appKey}`).adapter.rooms.get(channelName);
        let subscriptionCount = room ? room.size : 0;
        let channel = this.server.getChannelInstance(channelName);

        let result = {
            subscription_count: subscriptionCount,
            occupied: !!subscriptionCount
        };

        if (channel instanceof PresenceChannel) {
            channel.getMembers(`/${appKey}`, channelName).then(members => {
                res.json({
                    ...result,
                    ...{
                        user_count: members.length,
                    },
                });
            });
        } else {
            res.json(result);
        }
    }

    /**
     * Get the users of a channel.
     *
     * @param  {Request}  req
     * @param  {Response}  res
     * @return {boolean}
     */
    protected getChannelUsers(req: Request, res: Response): boolean {
        let appKey = req.echoApp.key;
        let channelName = req.params.channelName;
        let channel = this.server.getChannelInstance(channelName);

        if (!(channel instanceof PresenceChannel)) {
            return this.badResponse(
                req,
                res,
                'User list is only possible for Presence Channels.'
            );
        }

        channel.getMembers(`/${appKey}`, channelName).then(members => {
            res.json({ users: members });
        }, error => {
            res.json({ users: [] });

            Log.error(error);
        });
    }

    /**
     * Broadcast an event.
     *
     * @param  {Request}  req
     * @param  {Response}  res
     * @return {boolean}
     */
    protected broadcastEvent(req: Request, res: Response): boolean {
        if (
            (!req.body.channels && !req.body.channel) ||
            !req.body.name ||
            !req.body.data
        ) {
            return this.badResponse(req, res, 'The received data is incorrect.');
        }

        let channels = req.body.channels || [req.body.channel] as string[];

        if (channels.length > this.options.eventLimits.maxChannelsAtOnce) {
            return this.badResponse(req, res, `Cannot broadcast a message to more than ${this.options.eventLimits.maxChannelsAtOnce} channels at once.`);
        }

        if (req.body.name.length > this.options.eventLimits.maxNameLength) {
            return this.badResponse(req, res, `Event name is too long. Maximum allowed size is ${this.options.eventLimits.maxNameLength}.`);
        }

        let payloadSizeInKb = Utils.dataToBytes(req.body.data) / 1024;

        if (payloadSizeInKb > parseFloat(this.options.eventLimits.maxPayloadInKb as string)) {
            return this.badResponse(req, res, `The event data should be less than ${this.options.eventLimits.maxPayloadInKb} KB.`);
        }

        let appKey = req.echoApp.key;
        let socketId = req.body.socket_id || null;

        if (socketId) {
            this.findSocketInNamespace(`/${appKey}`, socketId).then((socket: RemoteSocket) => {
                this.sendEventToChannels(`/${appKey}`, channels, req, socket);
            });
        } else {
            this.sendEventToChannels(`/${appKey}`, channels, req);
        }

        if (this.options.prometheus.enabled) {
            this.prometheus.markApiMessage(`/${appKey}`, req, { message: 'ok' });
        }

        res.json({ message: 'ok' });

        return true;
    }

    /**
     * Retrieve the statistics for a given app.
     *
     * @param  {Request}  req
     * @param  {Response}  res
     * @return {boolean}
     */
    protected getStats(req, res): boolean {
        let start = req.query.start || dayjs().subtract(7, 'day').unix();
        let end = req.query.end || dayjs().unix();

        if (!req.echoApp.enableStats) {
            return res.json({ stats: [] });
        }

        this.stats.getSnapshots(req.echoApp, start, end).then(snapshots => {
            res.json({ stats: snapshots });
        });

        return true;
    }

    /**
     * Retrieve the current statistics for a given app.
     *
     * @param  {Request}  req
     * @param  {Response}  res
     * @return {boolean}
     */
    protected getCurrentStats(req, res): boolean {
        if (!req.echoApp.enableStats) {
            return res.json({ stats: [] });
        }

        this.stats.getStats(req.echoApp).then(stats => {
            res.json({ stats });
        });

        return true;
    }

    /**
     * Get the registered Prometheus metrics.
     *
     * @param  {Request}  req
     * @param  {Response}  res
     * @return {boolean}
     */
    protected getPrometheusMetrics(req, res): boolean {
        res.set('Content-Type', this.prometheus.register.contentType);

        if (req.query.json) {
            this.prometheus.register.getMetricsAsJSON().then(metrics => {
                res.json({ data: metrics });
            });
        } else {
            this.prometheus.register.metrics().then(content => {
                res.end(content);
            });
        }

        return true;
    }

    /**
     * Find a Socket by Id in a given namespace.
     *
     * @param  {string}  namespace
     * @param  {string}  socketId
     * @return {Promise<RemoteSocket>}
     */
    protected findSocketInNamespace(namespace: string, socketId: string): Promise<RemoteSocket> {
        return this.io.of(namespace).fetchSockets().then((sockets: any) => {
            let socket = sockets.find((socket: RemoteSocket) => socket.id === socketId);

            if (this.options.development) {
                Log.info({
                    time: new Date().toISOString(),
                    socketId,
                    socket,
                    action: 'socket_find',
                    status: socket ? 'success' : 'failed',
                });
            }

            return socket;
        });
    }

    /**
     * Send the events from the request to given namespace,
     * with the broadcasting of a socket (if any).
     *
     * @param  {string}  namespace
     * @param  {string[]}  channels
     * @param  {Request}  req
     * @param  {RemoteSocket|null}  socket
     * @return {void}
     */
    protected sendEventToChannels(namespace: string, channels: string[], req: Request, socket: RemoteSocket = null): void
    {
        if (this.options.development) {
            Log.info({
                time: new Date().toISOString(),
                socket: socket ? socket : null,
                action: 'send_event',
                status: 'success',
                namespace,
                channels,
                body: req.body,
                params: req.params,
                query: req.query,
            });
        }

        channels.forEach(channel => {
            if (socket) {
                this.io.of(namespace)
                    .to(channel)
                    .except(socket.id)
                    .emit(req.body.name, channel, JSON.parse(req.body.data));
            } else {
                this.io.of(namespace)
                    .to(channel)
                    .emit(req.body.name, channel, JSON.parse(req.body.data));
            }

            if (this.options.prometheus.enabled) {
                this.prometheus.markWsMessage(namespace, req.body.name, channel, req.body.data);
            }

            this.stats.markWsMessage(req.echoApp);
        });

        this.stats.markApiMessage(req.echoApp);
    }

    /**
     * Get the app ID from the URL.
     *
     * @param  {Request}  req
     * @return {string|null}
     */
    protected getAppId(req: Request): string|null {
        return req.params.appId || null;
    }

    /**
     * Get the app key from the request.
     *
     * @param  {Request}  req
     * @return {string|null}
     */
    protected getAppKey(req: Request): string|null {
        return (req.query.auth_key || null) as string|null;
    }

    /**
     * Check is an incoming request can access the api.
     *
     * @param  {Request}  req
     * @param  {Response}  res
     * @return {Promise<boolean>}
     */
    protected signatureIsValid(req: Request, res: Response): Promise<boolean> {
        return this.getSignedToken(req).then(token => {
            return token === req.query.auth_signature;
        });
    }

    /**
     * Get the signed token from the given request.
     *
     * @param  {Request}  req
     * @return {Promise<string>}
     */
    protected getSignedToken(req: Request): Promise<string> {
        let app = req.echoApp;

        return new Promise((resolve, reject) => {
            if (! app) {
                reject({ reason: 'The request is not authenticated.' });
            }

            let key = req.query.auth_key;
            let token = new Pusher.Token(key, app.secret);

            const params = {
                auth_key: app.key,
                auth_timestamp: req.query.auth_timestamp,
                auth_version: req.query.auth_version,
                ...req.query,
                ...req.params,
            };

            delete params['auth_signature'];
            delete params['body_md5']
            delete params['appId'];
            delete params['appKey'];
            delete params['channelName'];

            if (req.rawBody && Object.keys(req.body).length > 0) {
                params['body_md5'] = pusherUtil.getMD5(req.rawBody);
            }

            resolve(
                token.sign([
                    req.method.toUpperCase(),
                    req.path,
                    pusherUtil.toOrderedArray(params).join('&'),
                ].join("\n"))
            );
        });
    }

    /**
     * Throw 400 response.
     *
     * @param  {Request}  req
     * @param  {Response}  res
     * @param  {string}  message
     * @return {boolean}
     */
    protected badResponse(req: Request, res: Response, message: string): boolean {
        res.statusCode = 400;
        res.json({ error: message });

        return false;
    }

    /**
     * Throw 403 response.
     *
     * @param  {Request}  req
     * @param  {Response}  res
     * @return {boolean}
     */
    protected unauthorizedResponse(req: Request, res: Response): boolean {
        res.statusCode = 403;
        res.json({ error: 'Unauthorized' });

        return false;
    }

    /**
     * Throw 404 response.
     *
     * @param  {Request}  req
     * @param  {Response}  res
     * @return {boolean}
     */
    protected notFoundResponse(req: Request, res: Response): boolean {
        let appId = this.getAppId(req);

        res.statusCode = 404;
        res.json({ error: `The app ${appId} does not exist` });

        return false;
    }

    /**
     * Throw 429 response.
     *
     * @param  {Request}  req
     * @param  {Response}  res
     * @return {boolean}
     */
    protected tooManyRequestsResponse(req: Request, res: Response): boolean {
        res.statusCode = 429;
        res.json({ error: 'Too many requests' });

        return false;
    }

    /**
     * Throw 503 response.
     *
     * @param  {Request}  req
     * @param  {Response}  res
     * @return {boolean}
     */
    protected serviceUnavailableResponse(req, res): boolean {
        res.statusCode = 503;
        res.json({ error: 'Service unavailable' });

        return false;
    }
}
