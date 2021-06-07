import { Channel } from './channel';
import { Socket } from './../socket';

const Pusher = require('pusher');

export class PrivateChannel extends Channel {
    /**
     * Join a given channel.
     *
     * @param  {Socket}  socket
     * @param  {any}  data
     * @return {Promise<any>}
     */
    join(socket: Socket, data: any): Promise<any> {
        return this.signatureIsValid(socket, data).then(isValid => {
            if (isValid) {
                return super.join(socket, data);
            }
        });
    }

    /**
     * Check is an incoming connection can subscribe.
     *
     * @param  {Socket}  socket
     * @param  {any}  data
     * @return {Promise<boolean>}
     */
    protected signatureIsValid(socket: Socket, data: any): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.getSignedToken(socket, data).then(token => {
                resolve(token === data.token);
            });
        });
    }

    /**
     * Get the signed token from the given socket connection.
     *
     * @param  {Socket}  socket
     * @param  {any}  data
     * @return {Promise<string>}
     */
    protected getSignedToken(socket: Socket, data: any): Promise<string> {
        return new Promise((resolve, reject) => {
            let token = new Pusher.Token(socket.data.echoApp.key, socket.data.echoApp.secret);

            resolve(
                socket.data.echoApp.key + ':' + token.sign(this.getDataToSignForToken(socket, data))
            );
        });
    }

    /**
     * Get the data to sign for the token.
     *
     * @param  {Socket}  socket
     * @param  {any}  data
     * @return {string}
     */
    protected getDataToSignForToken(socket: Socket, data: any): string {
        return `${socket.id}:${data.channel}`;
    }
}
