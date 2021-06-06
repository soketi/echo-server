export interface App {
    id: string|number;
    key: string|number;
    secret: string;
    maxConnections: number;
    enableStats: boolean;
}

export class App {
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
    public maxConnections: number;

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
    public maxBackendEventsPerMinute: number;

    /**
     * @type {number}
     */
    public maxClientEventsPerMinute: number;

    /**
     * @type {number}
     */
    public maxReadRequestsPerMinute: number;

    /**
     * Create a new app from object.
     *
     * @param {any} app
     */
    constructor(app: any) {
        this.id = app.id;
        this.key = app.key;
        this.secret = app.secret;
        this.maxConnections = app.maxConnections || app.max_connections || -1;
        this.enableStats = app.enableStats || app.enable_stats || false;
        this.enableClientMessages = app.enableClientMessages || app.enable_client_messages || true;
        this.maxBackendEventsPerMinute = app.maxBackendEventsPerMinute || app.max_backend_events_per_min || -1;
        this.maxClientEventsPerMinute = app.maxClientEventsPerMinute || app.max_client_events_per_min || -1;
        this.maxReadRequestsPerMinute = app.maxReadRequestsPerMinute || app.max_read_req_per_min || -1;
    }
}
