import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import express, { Application } from 'express';
import { Log } from './log';
import { Server as SocketIoServer } from 'socket.io';

const fs = require('fs');
const Redis = require('ioredis');
const redisAdapter = require('socket.io-redis');

export class Server {
    /**
     * The Express.js HTTP server.
     *
     * @type {Application}
     */
    public express: Application;

    /**
     * Socket.io client.
     *
     * @type {SocketIoServer}
     */
    public io: SocketIoServer;

    /**
     * Create a new server instance.
     *
     * @param {any} options
     */
    constructor(protected options: any) {
        //
    }

    /**
     * Initialize the server.
     *
     * @return {Promise<SocketIoServer>}
     */
    initialize(): Promise<SocketIoServer> {
        return this.buildServer(this.options.httpApi.protocol === 'https').then(() => {
            let host = this.options.host || '127.0.0.1';
            Log.success(`Running at ${host} on port ${this.options.port}`);

            this.configureAdapters();
            this.configureSocketIdGeneration();

            return this.io;
        }, error => {
            Log.error(error);

            return this.io;
        });
    }

    /**
     * Load SSL 'key' & 'cert' files if HTTPS is enabled.
     * Return the parameters needs for the SSL.
     *
     * @return {any}
     */
    protected configureSecurity(): { [key: string]: string|number; } {
        if (!this.options.ssl.certPath || !this.options.ssl.keyPath) {
            Log.error('SSL paths are missing in server config.');
        }

        return {
            cert: fs.readFileSync(this.options.ssl.certPath),
            key: fs.readFileSync(this.options.ssl.keyPath),
            ca: (this.options.ssl.caPath) ? fs.readFileSync(this.options.ssl.caPath) : '',
            passphrase: this.options.ssl.passphrase,
        };
    }

    /**
     * Create Socket.IO & HTTP(S) servers.
     *
     * @param  {boolean}  secure
     * @return {Promise<SocketIoServer>}
     */
    protected buildServer(secure: boolean): Promise<SocketIoServer> {
        return new Promise(resolve => {
            this.express = express();
            let httpOptions = this.options;

            if (secure) {
                httpOptions = {
                    ...httpOptions,
                    ...this.configureSecurity(),
                };
            }

            let server = secure
                ? createHttpsServer(httpOptions, this.express)
                : createHttpServer(this.express);

            server.listen(this.options.port, this.options.host);

            this.options.socketIoOptions = {
                ...this.options.socketIoOptions,
                ...{
                    cors: this.options.cors,
                },
            };

            resolve(
                this.io = new SocketIoServer(server, this.options.socketIoOptions)
            );
        });
    }

    /**
     * Configure the Socket.IO adapters.
     *
     * @return {void}
     */
    protected configureAdapters(): void {
        if (this.options.replication.driver === 'redis') {
            let pubClient = new Redis(this.options.database.redis);
            let subClient = new Redis(this.options.database.redis);

            this.io.adapter(redisAdapter({
                key: 'redis-adapter',
                pubClient,
                subClient,
            }));
        }
    }

    /**
     * Configure the Socket.IO ID generation.
     *
     * @return {void}
     */
    protected configureSocketIdGeneration(): void {
        let min = 0;
        let max = 10000000000;

        let randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

        this.io.engine.generateId = req => randomNumber(min, max) + '.' + randomNumber(min, max);
    }
}
