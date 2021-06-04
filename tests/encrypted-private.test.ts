import { Connector } from './connector';

jest.retryTimes(5);

describe('encrypted private channel test', () => {
    // TODO: Fix test.
    /* test('connects to encrypted private channel', done => {
        let client = Connector.newClientForEncryptedPrivateChannel();
        let pusher = Connector.newPusherClient();
        let roomName = Connector.randomChannelName();

        client.connector.socket.onAny((event, ...args) => {
            if (event === 'channel:joined' && args[0] === `private-encrypted-${roomName}`) {
                Connector.sendEventToChannel(pusher, `private-encrypted-${roomName}`, 'message', { message: 'hello' });
            }
        });

        Connector.connectToEncryptedPrivateChannel(client, roomName).listen('.message', e => {
            expect(e.message).toBe('hello');
            client.disconnect();
            done();
        });
    }); */

    test('whisper works', done => {
        let client1 = Connector.newClientForEncryptedPrivateChannel();
        let client2 = Connector.newClientForEncryptedPrivateChannel();
        let roomName = Connector.randomChannelName();

        Connector.connectToEncryptedPrivateChannel(client1, roomName)
            .listenForWhisper('typing', whisper => {
                expect(whisper.typing).toBe(true);
                client1.disconnect();
                client2.disconnect();
                done();
            });

        Connector.wait(5000).then(() => {
            Connector.connectToEncryptedPrivateChannel(client2, roomName)
                .whisper('typing', { typing: true });
        });
    });

    test('get app channels', done => {
        let client = Connector.newClientForEncryptedPrivateChannel();
        let pusher = Connector.newPusherClient();
        let roomName = Connector.randomChannelName();

        client.connector.socket.onAny((event, ...args) => {
            if (event === 'channel:joined') {
                pusher.get({ path: '/channels' }).then(res => res.json()).then(body => {
                    expect(body.channels[`private-encrypted-${roomName}`].occupied).toBe(true);
                    expect(body.channels[`private-encrypted-${roomName}`].subscription_count).toBe(1);

                    client.disconnect();
                    done();
                });
            }
        });

        Connector.connectToEncryptedPrivateChannel(client, roomName);
    });

    test('get app channel', done => {
        let client = Connector.newClientForEncryptedPrivateChannel();
        let pusher = Connector.newPusherClient();
        let roomName = Connector.randomChannelName();

        client.connector.socket.onAny((event, ...args) => {
            if (event === 'channel:joined') {
                pusher.get({ path: `/channels/private-encrypted-${roomName}` }).then(res => res.json()).then(body => {
                    expect(body.subscription_count).toBe(1);
                    expect(body.occupied).toBe(true);

                    client.disconnect();
                    done();
                });
            }
        });

        Connector.connectToEncryptedPrivateChannel(client, roomName);
    });
});
