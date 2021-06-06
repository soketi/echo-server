CREATE TABLE IF NOT EXISTS echo_apps (
  id varchar(255) PRIMARY KEY,
  "key" varchar(255) NOT NULL,
  secret varchar(255) NOT NULL,
  max_connections integer NOT NULL,
  enable_stats smallint NOT NULL
);

INSERT INTO echo_apps (id, "key", secret, max_connections, enable_stats) VALUES ('echo-app','echo-app-key','echo-app-secret',200, 1);
