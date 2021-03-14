import { Connector } from './connector';

describe('public channel test', () => {
    beforeEach(async done => {
        await Connector.wait(1000);
        done();
    });

    test('connects to public channel', done => {
        let client = Connector.newClient();
        let pusher = Connector.newPusherClient();

        Connector.connectToPublicChannel(client, 'world').listen('.greeting', e => {
            e = JSON.parse(e);

            expect(e.message).toBe('hello');
            client.disconnect();
            done();
        });

        client.connector.socket.onAny((event, ...args) => {
            if (event === 'channel:joined' && args[0] === 'world') {
                Connector.sendEventToPublicChannel(pusher, 'world', 'greeting', { message: 'hello' });
            }
        });
    });

    test('get app channels', done => {
        let client = Connector.newClient();
        let pusher = Connector.newPusherClient();

        Connector.connectToPublicChannel(client, 'uk');

        client.connector.socket.onAny((event, ...args) => {
            if (event === 'channel:joined' && args[0] === 'uk') {
                pusher.get({ path: '/channels' }).then(res => res.json()).then(body => {
                    expect(body.channels.world.occupied).toBe(true);
                    expect(body.channels.usa.occupied).toBe(true);
                    expect(body.channels.uk.occupied).toBe(true);

                    expect(body.channels.world.subscription_count).toBe(1);
                    expect(body.channels.usa.subscription_count).toBe(1);
                    expect(body.channels.uk.subscription_count).toBe(1);

                    client.disconnect();
                    done();
                });
            }
        });
    });

    test('get app channel', done => {
        let client = Connector.newClient();
        let pusher = Connector.newPusherClient();

        Connector.connectToPublicChannel(client, 'uk');

        client.connector.socket.onAny((event, ...args) => {
            if (event === 'channel:joined' && args[0] === 'uk') {
                pusher.get({ path: '/channels/uk' }).then(res => res.json()).then(body => {
                    expect(body.subscription_count).toBe(1);
                    expect(body.occupied).toBe(true);

                    client.disconnect();
                    done();
                });
            }
        });
    });
});
