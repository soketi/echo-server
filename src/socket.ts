import { App } from './app';
import { EchoServer } from './echo-server';
import { Socket as BaseSocket } from 'socket.io';

export class Socket extends BaseSocket {
    public echoApp: App;
}
