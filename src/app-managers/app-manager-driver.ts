import { App } from './../app';
import { EmittedData } from '../echo-server';
import { Socket } from './../socket';

export interface AppManagerDriver {
    /**
     * Find an app by given ID.
     */
    findById(id: string|number, socket: Socket, data: EmittedData): Promise<App|null>;

    /**
     * Find an app by given key.
     */
    findByKey(key: string|number, socket: Socket, data: EmittedData): Promise<App|null>;
}
