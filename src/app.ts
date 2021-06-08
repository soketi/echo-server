const { createHmac } = require('crypto');
import { Server as SocketIoServer } from 'socket.io';
import { Namespace } from 'socket.io';
import { Request } from './request';

const Pusher = require('pusher');
const pusherUtil = require('pusher/lib/util');

export interface AppInterface {
    id: string|number;
    key: string|number;
    secret: string;
    maxConnections: string|number;
    enableStats: boolean;
    enableClientMessages: boolean;
    maxBackendEventsPerMinute: string|number;
    maxClientEventsPerMinute: string|number;
    maxReadRequestsPerMinute: string|number;
    webhooks: Webhook[];
}

export interface Webhook {
    url: string;
    event_type: string;
}

export class App implements AppInterface {
    /**
     * @type {string|number}
     */
    public id: string|number;

    /**
     * @type {string|number}
     */
    public key: string|number;

    /**
     * @type {string}
     */
    public secret: string;

    /**
     * @type {number}
     */
    public maxConnections: string|number;

    /**
     * @type {boolean}
     */
    public enableStats: boolean;

    /**
     * @type {boolean}
     */
    public enableClientMessages: boolean;

    /**
     * @type {number}
     */
    public maxBackendEventsPerMinute: string|number;

    /**
     * @type {number}
     */
    public maxClientEventsPerMinute: string|number;

    /**
     * @type {number}
     */
    public maxReadRequestsPerMinute: string|number;

    /**
     * @type {Webhook[]}
     */
    public webhooks: Webhook[];

    static readonly CLIENT_EVENT_WEBHOOK = 'client-event';

    /**
     * Create a new app from object.
     */
    constructor(app: { [key: string]: any; }) {
        this.id = app.id;
        this.key = app.key;
        this.secret = app.secret;
        this.maxConnections = parseInt(app.maxConnections || app.max_connections || -1);
        this.enableStats = app.enableStats || app.enable_stats || false;
        this.enableClientMessages = app.enableClientMessages || app.enable_client_messages || true;
        this.maxBackendEventsPerMinute = parseInt(app.maxBackendEventsPerMinute || app.max_backend_events_per_min || -1);
        this.maxClientEventsPerMinute = parseInt(app.maxClientEventsPerMinute || app.max_client_events_per_min || -1);
        this.maxReadRequestsPerMinute = parseInt(app.maxReadRequestsPerMinute || app.max_read_req_per_min || -1);
        this.webhooks = app.webhooks || [];
    }

    /**
     * Create the HMAC for the given data.
     */
    createWebhookHmac(data: string): string {
        return createHmac('sha256', this.secret)
            .update(data)
            .digest('hex');
    }

    /**
     * Get the signing token from the request.
     */
    signingTokenFromRequest(req: Request): string {
        const params = {
            auth_key: this.key,
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

        return this.signingToken(
            req.method.toUpperCase(),
            req.path,
            pusherUtil.toOrderedArray(params).join('&'),
        )
    }

    /**
     * Get the signing token for the given parameters.
     */
    protected signingToken(method: string, path: string, params: string): string {
        let token = new Pusher.Token(this.key, this.secret);

        return token.sign([method, path, params].join("\n"));
    }
}
