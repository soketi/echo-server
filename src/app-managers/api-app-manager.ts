import { App } from './../app';
import { AppManagerDriver } from './app-manager-driver';
import { Log } from './../log';
import { SocketHttpClient } from './../socket-http-client';

export class ApiAppManager implements AppManagerDriver {
    /**
     * The request client to authenticate on.
     *
     * @type {SocketHttpClient}
     */
    protected socketHttpClient: SocketHttpClient;

    /**
     * Create a new app manager instance.
     *
     * @param {any} options
     */
    constructor(protected options: any) {
        this.socketHttpClient = new SocketHttpClient(options);
    }

    /**
     * Find an app by given ID.
     *
     * @param  {string|number}  id
     * @param  {any}  socket
     * @param  {any}  data
     * @return {Promise<App|null>}
     */
    findById(id: string|number, socket: any, data: any): Promise<App|null> {
        let options = {
            url: `${this.options.appManager.api.host}${this.options.appManager.api.endpoint}?appId=${id}&token=${this.options.appManager.api.token}`,
            headers: (data && data.auth && data.auth.headers) ? data.auth.headers : {},
            method: 'get',
            rejectUnauthorized: false,
        };

        return new Promise((resolve, reject) => {
            this.socketHttpClient.request(socket, options).then(body => {
                resolve(new App(body.app));
            }, error => reject(error));
        });
    }

    /**
     * Find an app by given key.
     *
     * @param  {string|number}  key
     * @param  {any}  socket
     * @param  {any}  data
     * @return {Promise<App|null>}
     */
    findByKey(key: string|number, socket: any, data: any): Promise<App|null> {
        let options = {
            url: `${this.options.appManager.api.host}${this.options.appManager.api.endpoint}?appKey=${key}&token=${this.options.appManager.api.token}`,
            headers: (data && data.auth && data.auth.headers) ? data.auth.headers : {},
            method: 'get',
            rejectUnauthorized: false,
        };

        return new Promise((resolve, reject) => {
            this.socketHttpClient.request(socket, options).then(body => {
                resolve(new App(body.app));
            }, error => reject(error));
        });
    }
}
