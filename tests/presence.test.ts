import { Connector } from './connector';

describe('presence channel test', () => {
    beforeEach(async done => {
        await Connector.wait(1000);
        done();
    });

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
        let roomName = Connector.randomChannelName();

        client.connector.socket.onAny((event, ...args) => {
            if (event === 'channel:joined' && args[0] === roomName) {
                Connector.sendEventToPublicChannel(pusher, roomName, 'message', { message: 'hello' });
            }
        });

        Connector.connectToPresenceChannel(client, roomName)
            .here(users => {
                expect(JSON.stringify(users)).toBe(JSON.stringify([user.user_info]));
            })
            .listen('.message', e => {
                e = JSON.parse(e);

                expect(e.message).toBe('hello');
                client.disconnect();
                done();
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
        let roomName = Connector.randomChannelName();

        aliceClient.connector.socket.onAny((event, ...args) => {
            if (event === 'channel:joined') {
                aliceClient.disconnect();
            }
        });

        Connector.connectToPresenceChannel(johnClient, roomName)
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

        Connector.connectToPresenceChannel(aliceClient, roomName);
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
        let roomName = Connector.randomChannelName();

        Connector.connectToPresenceChannel(johnClient, roomName)
            .here(users => {
                expect(JSON.stringify(users)).toBe(JSON.stringify([john.user_info]));
            })
            .joining(user => {
                expect(JSON.stringify(user)).not.toBe(JSON.stringify(john.user_info));
            });

        Connector.connectToPresenceChannel(johnSecondClient, roomName);

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
        let roomName = Connector.randomChannelName();

        Connector.connectToPresenceChannel(johnClient, roomName)
            .listenForWhisper('typing', whisper => {
                expect(whisper.typing).toBe(true);
                johnClient.disconnect();
                aliceClient.disconnect();
                done();
            });

        Connector.wait(2000);

        Connector.connectToPresenceChannel(aliceClient, roomName)
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
        let roomName = Connector.randomChannelName();

        client.connector.socket.onAny((event, ...args) => {
            if (event === 'channel:joined' && args[0] === `presence-${roomName}`) {
                pusher.get({ path: '/channels' }).then(res => res.json()).then(body => {
                    expect(body.channels[`presence-${roomName}`].occupied).toBe(true);
                    expect(body.channels[`presence-${roomName}`].subscription_count).toBe(1);

                    client.disconnect();
                    done();
                });
            }
        });

        Connector.connectToPresenceChannel(client, roomName);
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
        let roomName = Connector.randomChannelName();

        client.connector.socket.onAny((event, ...args) => {
            if (event === 'channel:joined' && args[0] === `presence-${roomName}`) {
                pusher.get({ path: `/channels/presence-${roomName}` }).then(res => res.json()).then(body => {
                    expect(body.subscription_count).toBe(1);
                    expect(body.occupied).toBe(true);
                    expect(body.user_count).toBe(1);

                    client.disconnect();
                    done();
                });
            }
        });

        Connector.connectToPresenceChannel(client, roomName);
    });
});
