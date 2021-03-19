import { App } from './../app';
import { AppManagerDriver } from './app-manager-driver';
import { Knex, knex } from 'knex'

export class MysqlAppManager implements AppManagerDriver {
    protected connection: Knex;

    /**
     * Create a new app manager instance.
     *
     * @param {any} options
     */
    constructor(protected options: any) {
        this.connection = knex({
            client: 'mysql',
            connection: {
                ...options.database.mysql,
            },
        });
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
            this.connection<App>(this.options.appManager.mysql.table).where('id', id).select('*').then(apps => {
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
            this.connection<App>(this.options.appManager.mysql.table).where('key', key).select('*').then(apps => {
                if (apps.length === 0) {
                    reject({ reason: `App ${key} not found.` });
                } else {
                    resolve(new App(apps[0]));
                }
            });
        });
    }
}
