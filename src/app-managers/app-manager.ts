import { App } from './../app';
import { AppManagerDriver } from './app-manager-driver';
import { ArrayAppManager } from './array-app-manager';
import { ApiAppManager } from './api-app-manager';
import { EmittedData } from '../echo-server';
import { Log } from './../log';
import { MysqlAppManager } from './mysql-app-manager';
import { Options } from './../options';
import { PostgresAppManager } from './postgres-app-manager';
import { Socket } from './../socket';

/**
 * Class that controls the key/value data store.
 */
export class AppManager implements AppManagerDriver {
    /**
     * App manager driver.
     */
    protected driver: AppManagerDriver;

    /**
     * Create a new database instance.
     */
    constructor(protected options: Options) {
        if (options.appManager.driver === 'array') {
            this.driver = new ArrayAppManager(options);
        } else if (options.appManager.driver === 'api') {
            this.driver = new ApiAppManager(options);
        } else if (options.appManager.driver === 'mysql') {
            this.driver = new MysqlAppManager(options);
        } else if (options.appManager.driver === 'postgres') {
            this.driver = new PostgresAppManager(options);
        } else {
            Log.error('Clients driver not set.');
        }
    }

    /**
     * Find an app by given ID.
     */
    findById(id: string|number, socket: Socket, data: EmittedData): Promise<App|null> {
        return this.driver.findById(id, socket, data);
    }

    /**
     * Find an app by given key.
     */
    findByKey(key: string|number, socket: Socket, data: EmittedData): Promise<App|null> {
        return this.driver.findByKey(key, socket, data);
    }
}
