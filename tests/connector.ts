import { decode as decodeBase64 } from '@stablelib/base64';
import Soketi from '@soketi/soketi-js';

const crypto = require('crypto');
const Pusher = require('pusher');

export class Connector {
    static newClient(authorizer = null, host = '127.0.0.1', port = 6001, key = 'echo-app-key'): Soketi {
        return new Soketi({
            host,
            key,
            port,
            authHost: `http://127.0.0.1:${port}`,
            authEndpoint: '/test/broadcasting/auth',
            authorizer,
            encryptionMasterKeyBase64: 'vwTqW/UBENYBOySubUo8fldlMFvCzOY8BFO5xAgnOus=',
        });
    }

    static newClientForPresenceUser(user: any, host = '127.0.0.1', port = 6001, key = 'echo-app-key'): Soketi {
        return this.newClient((channel, options) => ({
            authorize: (socketId, callback) => {
                callback(false, {
                    auth: this.signTokenForPresenceChannel(socketId, channel, user),
                    channel_data: JSON.stringify(user),
                })
            },
        }), host, port, key);
    }

    static newClientForPrivateChannel(host = '127.0.0.1', port = 6001, key = 'echo-app-key'): Soketi {
        return this.newClient((channel, options) => ({
            authorize: (socketId, callback) => {
                callback(false, {
                    auth: this.signTokenForPrivateChannel(socketId, channel),
                    channel_data: null,
                })
            },
        }), host, port, key);
    }

    static newClientForEncryptedPrivateChannel(host = '127.0.0.1', port = 6001, key = 'echo-app-key'): Soketi {
        return this.newClient((channel, options) => ({
            authorize: (socketId, callback) => {
                callback(false, {
                    auth: this.signTokenForPrivateChannel(socketId, channel),
                    channel_data: null,
                    shared_secret: crypto.createHash('sha256').update(
                        Buffer.concat([Buffer.from(channel.name), decodeBase64('vwTqW/UBENYBOySubUo8fldlMFvCzOY8BFO5xAgnOus=')])
                    ).digest(),
                })
            },
        }), host, port, key);
    }

    static connectToPublicChannel(client, channel: string): any {
        return client.channel(channel);
    }

    static connectToPrivateChannel(client, channel: string): any {
        return client.private(channel);
    }

    static connectToEncryptedPrivateChannel(client, channel: string): any {
        return client.encryptedPrivate(channel);
    }

    static connectToPresenceChannel(client, channel: string): any {
        return client.join(channel);
    }

    static newPusherClient(
        appId = 'echo-app',
        key = 'echo-app-key',
        secret = 'echo-app-secret',
        host = '127.0.0.1',
        port = 6001
    ): typeof Pusher {
        return new Pusher({
            appId,
            key,
            secret,
            cluster: 'mt1',
            host,
            port,
            wshost: host,
            wsPort: port,
            wssPort: port,
            httpHost: host,
            httpPort: port,
            httpsPort: port,
            encryptionMasterKeyBase64: 'vwTqW/UBENYBOySubUo8fldlMFvCzOY8BFO5xAgnOus=',
        });
    }

    static sendEventToChannel(pusher, channel: string, event: string, body: any): any {
        return pusher.trigger(channel, event, body);
    }

    static signTokenForPrivateChannel(
        socketId: string,
        channel: any,
        key = 'echo-app-key',
        secret = 'echo-app-secret'
    ): string {
        let token = new Pusher.Token(key, secret);

        return key + ':' + token.sign(`${socketId}:${channel.name}`);
    }

    static signTokenForPresenceChannel(
        socketId: string,
        channel: any,
        channelData: any,
        key = 'echo-app-key',
        secret = 'echo-app-secret'
    ): string {
        let token = new Pusher.Token(key, secret);

        return key + ':' + token.sign(`${socketId}:${channel.name}:${JSON.stringify(channelData)}`);
    }

    static wait(ms): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static randomChannelName(): string {
        return `channel-${Math.floor(Math.random() * 10000000)}`;
    }
}
