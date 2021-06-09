import { Webhook } from './app';
import { Socket } from './socket';
import { SocketHttpClient } from './socket-http-client';

export interface WebhookEmittedData {
    name: string;
    channel: string;
    data: {
        [key: string]: any;
    };
}

export class WebhookSender extends SocketHttpClient {
    /**
     * Prepare headers for request to app server.
     */
    protected prepareHeaders(socket: Socket, options: any): any {
        let headers = super.prepareHeaders(socket, options);

        headers['X-Pusher-Key'] = socket.data.echoApp.key;
        headers['X-Pusher-Signature'] = socket.data.echoApp.createWebhookHmac(JSON.stringify(options.data));

        return headers;
    }

    /**
     * Send the given events to the webhooks of the app that
     * the given Socket is currently connected for.
     */
    public send(eventType: string, timeInMs: number, events: WebhookEmittedData[], socket: Socket) {
        socket.data.echoApp.webhooks.forEach((webhook: Webhook) => {
            if (eventType === webhook.event_type) {
                this.request(socket, {
                    url: webhook.url,
                    method: 'post',
                    data: {
                        time_ms: timeInMs,
                        events,
                    },
                });
            }
        });
    }
}
