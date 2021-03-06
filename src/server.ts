import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { Application } from 'express';
import { Log } from './log';
import { Options } from './options';
import { Server as SocketIoServer } from 'socket.io';

const express = require('express');
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
     */
    constructor(protected options: Options) {
        //
    }

    /**
     * Initialize the server.
     */
    initialize(): Promise<SocketIoServer> {
        return this.buildServer(this.options.httpApi.protocol === 'https').then(() => {
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
                ? createHttpsServer(httpOptions as object, this.express)
                : createHttpServer(this.express);

            server.listen(this.options.port, this.options.host);

            let socketIoOptions = {
                cors: this.options.cors,
                maxHttpBufferSize: parseFloat(this.options.eventLimits.maxPayloadInKb as string) * 1024,
                transports: ['websocket'],
            };

            resolve(
                this.io = new SocketIoServer(server, socketIoOptions as object)
            );
        });
    }

    /**
     * Configure the Socket.IO adapters.
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
     */
    protected configureSocketIdGeneration(): void {
        let min = 0;
        let max = 10000000000;

        let randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

        this.io.engine.generateId = req => randomNumber(min, max) + '.' + randomNumber(min, max);
    }
}
