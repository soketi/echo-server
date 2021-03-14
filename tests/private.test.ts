import { Connector } from './connector';

describe('private channel test', () => {
    beforeEach(async done => {
        await Connector.wait(1000);
        done();
    });

    test('connects to private channel', done => {
        let client = Connector.newClientForPrivateChannel();
        let pusher = Connector.newPusherClient();

        Connector.connectToPrivateChannel(client, 'room').listen('.message', e => {
            e = JSON.parse(e);

            expect(e.message).toBe('hello');
            client.disconnect();
            done();
        });

        client.connector.socket.onAny((event, ...args) => {
            if (event === 'channel:joined' && args[0] === 'private-room') {
                Connector.sendEventToPublicChannel(pusher, 'private-room', 'message', { message: 'hello' });
            }
        });
    });

    test('whisper works', done => {
        let client1 = Connector.newClientForPrivateChannel();
        let client2 = Connector.newClientForPrivateChannel();

        Connector.connectToPrivateChannel(client1, 'room')
            .listenForWhisper('typing', whisper => {
                expect(whisper.typing).toBe(true);
                client1.disconnect();
                client2.disconnect();
                done();
            });

        Connector.connectToPrivateChannel(client2, 'room')
            .whisper('typing', { typing: true });
    });

    test('get app channels', done => {
        let client = Connector.newClientForPrivateChannel();
        let pusher = Connector.newPusherClient();

        Connector.connectToPrivateChannel(client, 'uk');

        client.connector.socket.onAny((event, ...args) => {
            if (event === 'channel:joined' && args[0] === 'private-uk') {
                pusher.get({ path: '/channels' }).then(res => res.json()).then(body => {
                    expect(body.channels['private-uk'].occupied).toBe(true);
                    expect(body.channels['private-uk'].subscription_count).toBe(1);

                    client.disconnect();
                    done();
                });
            }
        });
    });

    test('get app channel', done => {
        let client = Connector.newClientForPrivateChannel();
        let pusher = Connector.newPusherClient();

        Connector.connectToPrivateChannel(client, 'uk');

        client.connector.socket.onAny((event, ...args) => {
            if (event === 'channel:joined' && args[0] === 'private-uk') {
                pusher.get({ path: '/channels/private-uk' }).then(res => res.json()).then(body => {
                    expect(body.subscription_count).toBe(1);
                    expect(body.occupied).toBe(true);

                    client.disconnect();
                    done();
                });
            }
        });
    });
});
