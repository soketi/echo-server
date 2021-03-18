interface App {
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
     * Create a new app from object.
     *
     * @param {App} app
     */
    constructor(app: App) {
        this.id = app.id;
        this.key = app.key;
        this.secret = app.secret;
        this.maxConnections = app.maxConnections || -1;
        this.enableStats = app.enableStats || false;
    }
}
