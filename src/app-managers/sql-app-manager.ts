import { App } from './../app';
import { AppManagerDriver } from './app-manager-driver';
import { EmittedData } from './../echo-server';
import { Knex, knex } from 'knex';
import { Socket } from './../socket';

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
     * @param  {Socket}  socket
     * @param  {EmittedData}  data
     * @return {Promise<App|null>}
     */
    findById(id: string, socket: Socket, data: EmittedData): Promise<App|null> {
        return this.selectById(id).then(apps => {
            return apps.length === 0
                ? null
                : new App(apps[0] || apps);
        });
    }

    /**
     * Find an app by given key.
     *
     * @param  {string}  key
     * @param  {Socket}  socket
     * @param  {EmittedData}  data
     * @return {Promise<App|null>}
     */
    findByKey(key: string, socket: Socket, data: EmittedData): Promise<App|null> {
        return this.selectByKey(key).then(apps => {
            return apps.length === 0
                ? null
                : new App(apps[0] || apps);
        });
    }

    /**
     * Make a Knex selection for the app ID.
     *
     * @param  {string}  id
     * @return {App[]}
     */
    protected selectById(id: string): any {
        return this.connection<App>(this.appsTableName())
            .where('id', id)
            .select('*');
    }

    /**
     * Make a Knex selection for the app key.
     *
     * @param  {string}  key
     * @return {App[]}
     */
    protected selectByKey(key: string): any {
        return this.connection<App>(this.appsTableName())
            .where('key', key)
            .select('*');
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
     protected abstract knexConnectionDetails(): { [key: string]: any; };

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
