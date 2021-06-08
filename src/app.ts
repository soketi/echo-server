import { Namespace } from 'socket.io';
import { Server as SocketIoServer } from 'socket.io';

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
    }
}
