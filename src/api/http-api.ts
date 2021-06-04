import { App } from './../app';
import { AppManager } from './../app-managers';
import { Log } from './../log';
import { PresenceChannel } from './../channels/presence-channel';
import { Prometheus } from './../prometheus';
import { RateLimiter } from '../rate-limiter';
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
     * @param {any} server
     * @param {any} io
     * @param {any} express
     * @param {any} options
     * @param {AppManager} appManager
     * @param {Stats} stats
     * @param {Prometheus} prometheus
     */
    constructor(
        protected server: any,
        protected io: any,
        protected express: any,
        protected options: any,
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

        this.express.get('/', (req, res) => this.getHealth(req, res));
        this.express.get('/health', (req, res) => this.getHealth(req, res));
        this.express.get('/ready', (req, res) => this.getReadiness(req, res));
        this.express.get('/usage', (req, res) => this.getUsage(req, res));

        let readRateLimiter = (req, res, next) => this.readRateLimiter(req, res, next);
        let broadcastEventRateLimiter = (req, res, next) => this.broadcastEventRateLimiter(req, res, next);

        this.express.get('/apps/:appId/channels', readRateLimiter, (req, res) => this.getChannels(req, res));
        this.express.get('/apps/:appId/channels/:channelName', readRateLimiter, (req, res) => this.getChannel(req, res));
        this.express.get('/apps/:appId/channels/:channelName/users', readRateLimiter, (req, res) => this.getChannelUsers(req, res));
        this.express.post('/apps/:appId/events', broadcastEventRateLimiter, (req, res) => this.broadcastEvent(req, res));

        if (this.options.stats.enabled) {
            this.express.get('/apps/:appId/stats', readRateLimiter, (req, res) => this.getStats(req, res));
            this.express.get('/apps/:appId/stats/current', readRateLimiter, (req, res) => this.getCurrentStats(req, res));
        }

        if (this.options.prometheus.enabled) {
            this.express.get('/metrics', (req, res) => this.getPrometheusMetrics(req, res));
        }
    }

    /**
     * Add CORS middleware if applicable.
     *
     * @return {void}
     */
    protected registerCorsMiddleware(): void {
        this.express.use((req, res, next) => {
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

        this.express.use((req, res, next) => {
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
            verify: (req, res, buffer) => {
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
        this.express.use('/apps/*', (req, res, next) => {
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
        this.express.param('appId', (req, res, next) => {
            this.signatureIsValid(req).then(isValid => {
                if (!isValid) {
                    this.unauthorizedResponse(req, res);
                } else {
                    next()
                }
            });
        });
    }

    /**
     * Create a rate limiter for the /events endpoint.
     *
     * @param  {any}  req
     * @param  {any}  res
     * @param  {function}  next
     * @return {any}
     */
    protected broadcastEventRateLimiter(req, res, next): any {
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
            return this.tooManyRequestsResponse(req, res);
        });
    }

    /**
     * Create a rate limiter for any read-only endpoint.
     *
     * @param  {any}  req
     * @param  {any}  res
     * @param  {function}  next
     * @return {any}
     */
    protected readRateLimiter(req, res, next): any {
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
     * @param  {any}  req
     * @param  {any}  res
     * @return {void}
     */
    protected getHealth(req: any, res: any): void {
        res.send('OK');
    }

    /**
     * Outputs a simple message to check if the server accepts new connections.
     *
     * @param  {any}  req
     * @param  {any}  res
     * @return {void}
     */
    protected getReadiness(req: any, res: any): void {
        if (this.server.closing) {
            this.serviceUnavailableResponse(req, res);
        } else {
            res.send('OK');
        }
    }

    /**
     * Get details regarding the process usage.
     *
     * @param  {any}  req
     * @param  {any}  res
     * @return {void}
     */
    protected getUsage(req: any, res: any): void {
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
     * @param  {any}  req
     * @param  {any}  res
     * @return {void}
     */
    protected getChannels(req: any, res: any): void {
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
     * @param  {any}  req
     * @param  {any}  res
     * @return {void}
     */
    protected getChannel(req: any, res: any): void {
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
     * @param  {any}  req
     * @param  {any}  res
     * @return {boolean}
     */
    protected getChannelUsers(req: any, res: any): boolean {
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
     * @param  {any}  req
     * @param  {any}  res
     * @return {boolean}
     */
    protected broadcastEvent(req: any, res: any): boolean {
        if (
            (!req.body.channels && !req.body.channel) ||
            !req.body.name ||
            !req.body.data
        ) {
            return this.badResponse(req, res, 'The received data is incorrect.');
        }

        let channels = req.body.channels || [req.body.channel];

        if (channels.length > this.options.eventLimits.maxChannelsAtOnce) {
            return this.badResponse(req, res, `Cannot broadcast a message to more than ${this.options.httpApi.hardLimits.maxChannelsAtOnce} channels at once.`);
        }

        if (req.body.name.length > this.options.eventLimits.maxNameLength) {
            return this.badResponse(req, res, `Event name is too long. Maximum allowed size is ${this.options.httpApi.hardLimits.maxEventNameLength}.`);
        }

        let payloadSizeInKb = Utils.dataToBytes(req.body.data) / 1024;

        if (payloadSizeInKb > parseFloat(this.options.eventLimits.maxPayloadInKb)) {
            return this.badResponse(req, res, `The event data should be less than ${this.options.eventLimits.maxPayloadInKb} KB.`);
        }

        let appKey = req.echoApp.key;
        let socketId = req.body.socket_id || null;

        if (socketId) {
            this.findSocketInNamespace(`/${appKey}`, socketId).then(socket => {
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
     * @param  {any}  req
     * @param  {any}  res
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
     * @param  {any}  req
     * @param  {any}  res
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
     * @param  {any}  req
     * @param  {any}  res
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
     * @return {Promise<any>}
     */
    protected findSocketInNamespace(namespace: string, socketId: string): Promise<any> {
        return this.io.of(namespace).fetchSockets().then(sockets => {
            let socket = sockets.find(socket => socket.id === socketId);

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
     * @param  {any}  channels
     * @param  {any}  req
     * @param  {any}  socket
     * @return {void}
     */
    protected sendEventToChannels(namespace: string, channels: any, req: any, socket: any = null): void
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
     * @param  {any}  req
     * @return {string|null}
     */
    protected getAppId(req: any): string|null {
        return req.params.appId || null;
    }

    /**
     * Get the app key from the request.
     *
     * @param  {any}  req
     * @return {string|null}
     */
    protected getAppKey(req: any): string|null {
        return req.query.auth_key || null;
    }

    /**
     * Check is an incoming request can access the api.
     *
     * @param  {any}  req
     * @return {Promise<boolean>}
     */
    protected signatureIsValid(req: any): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.getSignedToken(req).then(token => {
                resolve(token === req.query.auth_signature);
            });
        });
    }

    /**
     * Get the signed token from the given request.
     *
     * @param  {any}  req
     * @return {Promise<string>}
     */
    protected getSignedToken(req: any): Promise<string> {
        let app = req.echoApp;

        return new Promise((resolve, reject) => {
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
     * @param  {any}  req
     * @param  {any}  res
     * @param  {string}  message
     * @return {boolean}
     */
    protected badResponse(req: any, res: any, message: string): boolean {
        res.statusCode = 400;
        res.json({ error: message });

        return false;
    }

    /**
     * Throw 403 response.
     *
     * @param  {any}  req
     * @param  {any}  res
     * @return {boolean}
     */
    protected unauthorizedResponse(req: any, res: any): boolean {
        res.statusCode = 403;
        res.json({ error: 'Unauthorized' });

        return false;
    }

    /**
     * Throw 404 response.
     *
     * @param  {any}  req
     * @param  {any}  res
     * @return {boolean}
     */
    protected notFoundResponse(req: any, res: any): boolean {
        let appId = this.getAppId(req);

        res.statusCode = 404;
        res.json({ error: `The app ${appId} does not exist` });

        return false;
    }

    /**
     * Throw 429 response.
     *
     * @param  {any}  req
     * @param  {any}  res
     * @return {boolean}
     */
    protected tooManyRequestsResponse(req: any, res: any): boolean {
        res.statusCode = 429;
        res.json({ error: 'Too many requests' });

        return false;
    }

    /**
     * Throw 503 response.
     *
     * @param  {any}  req
     * @param  {any}  res
     * @return {boolean}
     */
    protected serviceUnavailableResponse(req, res): boolean {
        res.statusCode = 503;
        res.json({ error: 'Service unavailable' });

        return false;
    }
}
