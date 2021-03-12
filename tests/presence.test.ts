import { Connector } from './connector';

describe('presence channel test', () => {
    test('connects to presence channel', done => {
        let user = {
            user_id: 1,
            user_info: {
                id: 1,
                name: 'John',
            },
        };

        let client = Connector.newClientForPresenceUser(user);
        let pusher = Connector.newPusherClient();

        Connector.connectToPresenceChannel(client, 'room')
            .here(users => {
                expect(JSON.stringify(users)).toBe(JSON.stringify([user.user_info]));
            })
            .listen('.message', e => {
                e = JSON.parse(e);

                expect(e.message).toBe('hello');
                client.disconnect();
                done();
            });

        client.connector.socket.onAny((event, ...args) => {
            if (event === 'channel:joined' && args[0] === 'presence-room') {
                Connector.sendEventToPublicChannel(pusher, 'presence-room', 'message', { message: 'hello' });
            }
        });
    });

    test('handles joins and leaves', done => {
        let john = {
            user_id: 1,
            user_info: {
                id: 1,
                name: 'John',
            },
        };

        let alice = {
            user_id: 2,
            user_info: {
                id: 2,
                name: 'Alice',
            },
        };

        let johnClient = Connector.newClientForPresenceUser(john);
        let aliceClient = Connector.newClientForPresenceUser(alice);

        Connector.connectToPresenceChannel(johnClient, 'room')
            .here(users => {
                expect(JSON.stringify(users)).toBe(JSON.stringify([john.user_info]));
            })
            .joining(user => {
                expect(JSON.stringify(user)).toBe(JSON.stringify(alice.user_info));
            })
            .leaving(user => {
                expect(JSON.stringify(user)).toBe(JSON.stringify(alice.user_info));
                johnClient.disconnect();
                done();
            });

        Connector.connectToPresenceChannel(aliceClient, 'room');

        aliceClient.connector.socket.onAny((event, ...args) => {
            if (event === 'channel:joined') {
                aliceClient.disconnect();
            }
        });
    });

    test('connecting twice with same user does not duplicate members', done => {
        let john = {
            user_id: 1,
            user_info: {
                id: 1,
                name: 'John',
            },
        };

        let johnClient = Connector.newClientForPresenceUser(john);
        let johnSecondClient = Connector.newClientForPresenceUser(john);

        Connector.connectToPresenceChannel(johnClient, 'room')
            .here(users => {
                expect(JSON.stringify(users)).toBe(JSON.stringify([john.user_info]));
            })
            .joining(user => {
                expect(JSON.stringify(user)).not.toBe(JSON.stringify(john.user_info));
            });

        Connector.connectToPresenceChannel(johnSecondClient, 'room');

        johnClient.disconnect();
        johnSecondClient.disconnect();
        done();
    });

    test('whisper works', async done => {
        let john = {
            user_id: 1,
            user_info: {
                id: 1,
                name: 'John',
            },
        };

        let alice = {
            user_id: 2,
            user_info: {
                id: 2,
                name: 'Alice',
            },
        };

        let johnClient = Connector.newClientForPresenceUser(john);
        let aliceClient = Connector.newClientForPresenceUser(alice);

        Connector.connectToPresenceChannel(johnClient, 'room')
            .listenForWhisper('typing', whisper => {
                expect(whisper.typing).toBe(true);
                johnClient.disconnect();
                aliceClient.disconnect();
                done();
            });

        Connector.connectToPresenceChannel(aliceClient, 'room')
            .whisper('typing', { typing: true });
    });

    test('get app channels', done => {
        let john = {
            user_id: 1,
            user_info: {
                id: 1,
                name: 'John',
            },
        };

        let client = Connector.newClientForPresenceUser(john);
        let pusher = Connector.newPusherClient();

        Connector.connectToPresenceChannel(client, 'world');
        Connector.connectToPresenceChannel(client, 'usa');
        Connector.connectToPresenceChannel(client, 'uk');

        client.connector.socket.onAny((event, ...args) => {
            if (event === 'channel:joined' && args[0] === 'presence-uk') {
                pusher.get({ path: '/channels' }).then(res => res.json()).then(body => {
                    expect(body.channels['presence-world'].occupied).toBe(true);
                    expect(body.channels['presence-usa'].occupied).toBe(true);
                    expect(body.channels['presence-uk'].occupied).toBe(true);

                    expect(body.channels['presence-world'].subscription_count).toBe(1);
                    expect(body.channels['presence-usa'].subscription_count).toBe(1);
                    expect(body.channels['presence-uk'].subscription_count).toBe(1);

                    client.disconnect();
                    done();
                });
            }
        });
    });

    test('get app channel', done => {
        let john = {
            user_id: 1,
            user_info: {
                id: 1,
                name: 'John',
            },
        };

        let client = Connector.newClientForPresenceUser(john);
        let pusher = Connector.newPusherClient();

        Connector.connectToPresenceChannel(client, 'world');
        Connector.connectToPresenceChannel(client, 'usa');
        Connector.connectToPresenceChannel(client, 'uk');

        client.connector.socket.onAny((event, ...args) => {
            if (event === 'channel:joined' && args[0] === 'presence-uk') {
                pusher.get({ path: '/channels/presence-uk' }).then(res => res.json()).then(body => {
                    expect(body.subscription_count).toBe(1);
                    expect(body.occupied).toBe(true);
                    expect(body.user_count).toBe(1);

                    client.disconnect();
                    done();
                });
            }
        });
    });
});
