import { Channel } from './channel';
import { EmittedData } from '../echo-server';
import { Member } from './presence-channel';
import { Socket } from './../socket';

const Pusher = require('pusher');

export class PrivateChannel extends Channel {
    /**
     * Join a given channel.
     *
     * @param  {Socket}  socket
     * @param  {EmittedData}  data
     * @return {Promise<Member|{ socket: Socket; data: EmittedData }|null>}
     */
    join(socket: Socket, data: EmittedData): Promise<Member|{ socket: Socket; data: EmittedData }|null> {
        return this.signatureIsValid(socket, data).then(isValid => {
            if (isValid) {
                return super.join(socket, data);
            } else {
                return null;
            }
        });
    }

    /**
     * Check is an incoming connection can subscribe.
     *
     * @param  {Socket}  socket
     * @param  {EmittedData}  data
     * @return {Promise<boolean>}
     */
    protected signatureIsValid(socket: Socket, data: EmittedData): Promise<boolean> {
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
     * @param  {EmittedData}  data
     * @return {Promise<string>}
     */
    protected getSignedToken(socket: Socket, data: EmittedData): Promise<string> {
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
     * @param  {EmittedData}  data
     * @return {string}
     */
    protected getDataToSignForToken(socket: Socket, data: EmittedData): string {
        return `${socket.id}:${data.channel}`;
    }
}
