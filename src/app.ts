export class App {
    /**
     * @type {string}
     */
    public id: string;

    /**
     * @type {string}
     */
    public key: string;

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
     * @param {object} app
     */
    constructor(app: {
        id: string;
        key: string;
        secret: string;
        maxConnections: number;
        enableStats: boolean;
    }) {
        this.id = app.id;
        this.key = app.key;
        this.secret = app.secret;
        this.maxConnections = app.maxConnections || -1;
        this.enableStats = app.enableStats || false;
    }
}
