import { Connector } from './connector';

describe('private channel test', () => {
    test('connects to private channel', done => {
        let client = Connector.newClientForPrivateChannel();
        let pusher = Connector.newPusherClient();
        let roomName = Connector.randomChannelName();

        client.connector.socket.onAny((event, ...args) => {
            if (event === 'channel:joined' && args[0] === `private-${roomName}`) {
                Connector.sendEventToChannel(pusher, `private-${roomName}`, 'message', { message: 'hello' });
            }
        });

        Connector.connectToPrivateChannel(client, roomName).listen('.message', e => {
            e = JSON.parse(e);

            expect(e.message).toBe('hello');
            client.disconnect();
            done();
        });
    });

    test('whisper works', async done => {
        let client1 = Connector.newClientForPrivateChannel();
        let client2 = Connector.newClientForPrivateChannel();
        let roomName = Connector.randomChannelName();

        Connector.connectToPrivateChannel(client1, roomName)
            .listenForWhisper('typing', whisper => {
                expect(whisper.typing).toBe(true);
                client1.disconnect();
                client2.disconnect();
                done();
            });

        await Connector.wait(5000);

        Connector.connectToPrivateChannel(client2, roomName)
            .whisper('typing', { typing: true });
    });

    test('get app channels', done => {
        let client = Connector.newClientForPrivateChannel();
        let pusher = Connector.newPusherClient();
        let roomName = Connector.randomChannelName();

        client.connector.socket.onAny((event, ...args) => {
            if (event === 'channel:joined') {
                pusher.get({ path: '/channels' }).then(res => res.json()).then(body => {
                    expect(body.channels[`private-${roomName}`].occupied).toBe(true);
                    expect(body.channels[`private-${roomName}`].subscription_count).toBe(1);

                    client.disconnect();
                    done();
                });
            }
        });

        Connector.connectToPrivateChannel(client, roomName);
    });

    test('get app channel', done => {
        let client = Connector.newClientForPrivateChannel();
        let pusher = Connector.newPusherClient();
        let roomName = Connector.randomChannelName();

        client.connector.socket.onAny((event, ...args) => {
            if (event === 'channel:joined') {
                pusher.get({ path: `/channels/private-${roomName}` }).then(res => res.json()).then(body => {
                    expect(body.subscription_count).toBe(1);
                    expect(body.occupied).toBe(true);

                    client.disconnect();
                    done();
                });
            }
        });

        Connector.connectToPrivateChannel(client, roomName);
    });
});
