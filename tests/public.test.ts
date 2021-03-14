import { Connector } from './connector';

describe('public channel test', () => {
    test('connects to public channel', done => {
        let client = Connector.newClient();
        let pusher = Connector.newPusherClient();
        let roomName = Connector.randomChannelName();

        Connector.connectToPublicChannel(client, roomName).listen('.greeting', e => {
            e = JSON.parse(e);

            expect(e.message).toBe('hello');
            client.disconnect();
            done();
        });

        client.connector.socket.onAny((event, ...args) => {
            if (event === 'channel:joined' && args[0] === roomName) {
                Connector.sendEventToChannel(pusher, roomName, 'greeting', { message: 'hello' });
            }
        });
    });

    test('get app channels', done => {
        let client = Connector.newClient();
        let pusher = Connector.newPusherClient();
        let roomName = Connector.randomChannelName();

        client.connector.socket.onAny((event, ...args) => {
            if (event === 'channel:joined') {
                pusher.get({ path: '/channels' }).then(res => res.json()).then(body => {
                    expect(body.channels[roomName].occupied).toBe(true);
                    expect(body.channels[roomName].subscription_count).toBe(1);

                    client.disconnect();
                    done();
                });
            }
        });

        Connector.connectToPublicChannel(client, roomName);
    });

    test('get app channel', done => {
        let client = Connector.newClient();
        let pusher = Connector.newPusherClient();
        let roomName = Connector.randomChannelName();

        client.connector.socket.onAny((event, ...args) => {
            if (event === 'channel:joined') {
                pusher.get({ path: `/channels/${roomName}` }).then(res => res.json()).then(body => {
                    expect(body.subscription_count).toBe(1);
                    expect(body.occupied).toBe(true);

                    client.disconnect();
                    done();
                });
            }
        });

        Connector.connectToPublicChannel(client, roomName);
    });
});
