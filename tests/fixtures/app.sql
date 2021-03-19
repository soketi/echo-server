CREATE TABLE IF NOT EXISTS `echo_apps` (
  `id` varchar(255) NOT NULL,
  `key` varchar(255) NOT NULL,
  `secret` varchar(255) NOT NULL,
  `max_connections` integer(10) NOT NULL,
  `enable_stats` tinyint(1) NOT NULL,
   PRIMARY KEY  (`id`)
);

INSERT INTO echo_apps (id, key, secret, max_connections, enable_stats) VALUES ('echo-app', 'echo-app-key', 'echo-app-secret', 200, 1);
