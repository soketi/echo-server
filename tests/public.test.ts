import { Connector } from './connector';

describe('public channel test', () => {
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
});
