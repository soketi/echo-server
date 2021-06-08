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

        headers['X-Pusher-Key'] = socket.echoApp.key;
        headers['X-Pusher-Signature'] = socket.echoApp.createWebhookHmac(JSON.stringify(options.data));

        return headers;
    }

    public send(eventType: string, timeInMs: number, events: WebhookEmittedData[], socket: Socket) {
        socket.echoApp.webhooks.forEach((webhook: Webhook) => {
            if (eventType === webhook.event_type) {
                this.request(socket, {
                    data: {
                        time_ms: timeInMs,
                        events,
                    },
                });
            }
        });
    }
}
