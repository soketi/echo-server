import { Connector, TestWebhookResponse } from './connector';

const { createHmac } = require('crypto');

jest.retryTimes(5);

/*
    That's how the .getWebhooks() response looks like when stored to the local webhooks.json file:

    [
        {
            "query":{
            },
            "body":{
                "time_ms":1623259443932,
                "events":[
                    {
                        "name":"client-webhook-for-private-whisper",
                        "channel":"private-channel-7592502",
                        "data":{
                        "shouldTriggerWebhook":true
                        }
                    }
                ]
            },
            "headers":{
                "accept":"application/json, text/plain, *",
                "content-type":"application/json;charset=utf-8",
                "x-requested-with":"XMLHttpRequest",
                "x-pusher-key":"echo-app-key",
                "x-pusher-signature":"ed7c52133b62a5bc243e320a779fafa8ceaa1b4605340020219f2b78bfc5b025",
                "user-agent":"axios/0.21.1",
                "content-length":"136",
                "host":"127.0.0.1:3000",
                "connection":"close"
            },
            "type":"client-event"
        }
    ]
*/

describe('webhooks test', () => {
    test('whisper triggers webhook', done => {
        let client1 = Connector.newClientForPrivateChannel();
        let client2 = Connector.newClientForPrivateChannel();
        let roomName = Connector.randomChannelName();

        Connector.connectToPrivateChannel(client1, roomName)
            .listenForWhisper('webhook-for-private-whisper', whisper => {
                expect(whisper.shouldTriggerWebhook).toBe(true);

                Connector.wait(15000).then(() => {
                    let sentWebhook: TestWebhookResponse = Connector.getWebhooks().find(webhook => {
                        return webhook.body.events[0].channel === `private-${roomName}`;
                    });

                    let signature = createHmac('sha256', 'echo-app-secret')
                        .update(JSON.stringify(sentWebhook.body))
                        .digest('hex');

                    expect(typeof sentWebhook.body.time_ms).toBe('number');
                    expect(sentWebhook.type).toBe('client-event');
                    expect(sentWebhook.headers['x-pusher-key']).toBe('echo-app-key');
                    expect(sentWebhook.headers['x-pusher-signature']).toBe(signature);

                    expect(JSON.stringify(sentWebhook.body.events)).toBe(JSON.stringify([{
                        name: 'client-webhook-for-private-whisper',
                        channel: `private-${roomName}`,
                        data: {
                            shouldTriggerWebhook: true,
                        },
                    }]));

                    client1.disconnect();
                    client2.disconnect();
                    done();
                });
            });

        Connector.wait(5000).then(() => {
            Connector.connectToPrivateChannel(client2, roomName)
                .whisper('webhook-for-private-whisper', { shouldTriggerWebhook: true });
        });
    });
});
