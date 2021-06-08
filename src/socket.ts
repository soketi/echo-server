import { App } from './app';
import {
    Socket as BaseSocket,
    RemoteSocket as BaseRemoteSocket,
} from 'socket.io';

export interface SocketData {
    echoApp?: App;
    [key: string]: any;
}

export class Socket extends BaseSocket {
    public echoApp: App;
    public data: SocketData;
}

export class RemoteSocket extends Socket {
    //
}
