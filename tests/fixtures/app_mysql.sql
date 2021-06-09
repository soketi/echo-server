CREATE TABLE IF NOT EXISTS `echo_apps` (
    `id` varchar(255) NOT NULL,
    `key` varchar(255) NOT NULL,
    `secret` varchar(255) NOT NULL,
    `max_connections` integer(10) NOT NULL,
    `enable_stats` tinyint(1) NOT NULL,
    `enable_client_messages` tinyint(1) NOT NULL,
    `max_backend_events_per_min` integer(10) NOT NULL,
    `max_client_events_per_min` integer(10) NOT NULL,
    `max_read_req_per_min` integer(10) NOT NULL,
    `json` JSON NOT NULL,
    PRIMARY KEY (`id`)
);

INSERT INTO echo_apps (
    id,
    `key`,
    secret,
    max_connections,
    enable_stats,
    enable_client_messages,
    max_backend_events_per_min,
    max_client_events_per_min,
    max_read_req_per_min,
    webhooks
) VALUES (
    'echo-app',
    'echo-app-key',
    'echo-app-secret',
    200,
    1,
    1,
    -1,
    -1,
    -1,
    '[
        {"event_type":"client-event","url":"http://127.0.0.1:3000/webhook1"}
    ]'
);
