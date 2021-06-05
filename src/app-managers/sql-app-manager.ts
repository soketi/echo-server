import { App } from './../app';
import { AppManagerDriver } from './app-manager-driver';
import { Knex, knex } from 'knex';

export abstract class SqlAppManager implements AppManagerDriver {
    /**
     * The Knex connection.
     *
     * @type {Knex}
     */
    protected connection: Knex;

    /**
     * Create a new app manager instance.
     *
     * @param {any} options
     */
    constructor(protected options: any) {
        let knexConfig = {
            client: this.knexClientName(),
            connection: this.knexConnectionDetails(),
            version: this.knexVersion(),
        };

        if (this.supportsPooling() && options.databasePooling.enabled) {
            knexConfig = {
                ...knexConfig,
                ...{
                    pool: {
                        min: options.databasePooling.min,
                        max: options.databasePooling.max,
                    },
                },
            };
        }

        this.connection = knex(knexConfig);
    }

    /**
     * Find an app by given ID.
     *
     * @param  {string}  id
     * @param  {any}  socket
     * @param  {any}  data
     * @return {Promise<App|null>}
     */
    findById(id: string, socket: any, data: any): Promise<App|null> {
        return new Promise((resolve, reject) => {
            this.connection<App>(this.appsTableName()).where('id', id).select('*').then(apps => {
                if (apps.length === 0) {
                    reject({ reason: `App ${id} not found.` });
                } else {
                    resolve(new App(apps[0]));
                }
            });
        });
    }

    /**
     * Find an app by given key.
     *
     * @param  {string}  key
     * @param  {any}  socket
     * @param  {any}  data
     * @return {Promise<App|null>}
     */
    findByKey(key: string, socket: any, data: any): Promise<App|null> {
        return new Promise((resolve, reject) => {
            this.connection<App>(this.appsTableName()).where('key', key).select('*').then(apps => {
                if (apps.length === 0) {
                    reject({ reason: `App ${key} not found.` });
                } else {
                    resolve(new App(apps[0]));
                }
            });
        });
    }

    /**
     * Get the client name to be used by Knex.
     *
     * @return {string}
     */
     protected abstract knexClientName(): string;

     /**
      * Get the object connection details for Knex.
      *
      * @return {any}
      */
     protected abstract knexConnectionDetails(): any;

     /**
      * Get the connection version for Knex.
      * For MySQL can be 5.7 or 8.0, etc.
      *
      * @return {string}
      */
     protected abstract knexVersion(): string;

     /**
      * Wether the manager supports pooling. This introduces
      * additional settings for connection pooling.
      *
      * @return {boolean}
      */
     protected abstract supportsPooling(): boolean;

     /**
      * Get the table name where the apps are stored.
      *
      * @return {string}
      */
     protected abstract appsTableName(): string;
}
