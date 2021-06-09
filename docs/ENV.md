- [Basic Environment Variables](#basic-environment-variables)
  - [Socket.IO Settings](#socketio-settings)
    - [Server](#server)
    - [SSL Settings](#ssl-settings)
    - [Replication](#replication)
    - [CORS Settings](#cors-settings)
  - [Applications](#applications)
    - [Default Application](#default-application)
    - [Apps Manager](#apps-manager)
      - [SQL-Related Drivers](#sql-related-drivers)
      - [MySQL](#mysql)
      - [PostgreSQL](#postgresql)
  - [Rate Limiting](#rate-limiting)
    - [Events Soft Limits](#events-soft-limits)
  - [Channels](#channels)
    - [Presence Channel Storage](#presence-channel-storage)
    - [Channels Soft Limits](#channels-soft-limits)
  - [Statsitics](#statsitics)
  - [Databases](#databases)
    - [Redis Configuration](#redis-configuration)
    - [Prometheus Configuration](#prometheus-configuration)
    - [MySQL Configuration](#mysql-configuration)
    - [PostgreSQL Configuration](#postgresql-configuration)
  - [Database Pooling](#database-pooling)
  - [Debugging](#debugging)
    - [Node Metadata](#node-metadata)

# Basic Environment Variables

## Socket.IO Settings

### Server

Configuration needed to specify the protocol, port and host for the server.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `SOCKET_HOST` | `host` | `null` | - | The host used for Socket.IO |
| `SOCKET_PORT` | `port` | `6001` | - | The port used for Socket.IO |
| `SOCKET_PROTOCOL` | `protocol` | `http` | `http`, `https` | The protocol used for the Socket.IO. |
| `HTTP_PROTOCOL` | `httpApi.protocol` | `http` | `http`, `https` | The protocol used for the HTTP API. |
| `HTTP_TRUST_PROXIES` | `trustProxies` | `false` | `true`, `false` | Wether to trust proxies at the HTTP API level. |
| `EXTRA_HEADERS` | `httpApi.extraHeaders` | `[]` | - | Extra headers to attach to HTTP API responses. |
| ~~`HTTP_MAX_PAYLOAD_SIZE`~~ | ~~`eventLimits.maxPayloadInKb`~~ | ~~`100`~~ | - | ~~The maximum size, in KB, for the broadcasted payloads incoming from the clients. Set this according to your needs.~~ Deprecated, please see `EVENT_MAX_SIZE_IN_KB` |
| `HTTP_MAX_REQUEST_SIZE` | `httpApi.requestLimitInMb` | `100` | - | The maximum size, in MB, for the total size of the request. A hard limit has been set to 100 MB. |

### SSL Settings

If the Socket.IO protocol is `https`, SSL settings can be applied with the following variables.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `SSL_CERT` | `ssl.certPath` | `''` | - | The path for SSL certificate file. |
| `SSL_KEY` | `ssl.keyPath` | `''` | - | The path for SSL key file. |
| `SSL_CA` | `ssl.caPath` | `''` | - | The path for CA certificate file. |
| `SSL_PASS` | `ssl.passphrase` | `''` | - | The passphrase for the SSL key file. |

### Replication

For local, single-instance applications, no replication is needed. However, to store presence channel data members replication is needed
in order to be able to scale up the Echo Server instances.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `REPLICATION_DRIVER` | `replication.driver` | `local` | `redis`, `local` | The database driver for storing socket data. Use `local` only for single-node, single-process instances. |

- `redis` - Enabled Pub/Sub communication between processes/nodes, can be scaled horizontally without issues.
- `local` - There is no communication or Pub/Sub. Recommended for single-instance, single-process apps.

### CORS Settings

A per-app CORS setting exists, but you can opt for global check for allowed origins. Defaults to all (`*`).

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `CORS_ALLOWED_ORIGINS` | `cors.origin` | `["*"]` | - | The array of allowed origins that can connect to the WS. |

## Applications

### Default Application

By default, the app is using a predefined list of applications to allow access.
In case you opt-in for another `APP_MANAGER_DRIVER`, these are the variables you can change in order to change the app settings.

For the rate limiting options, setting limits to `-1` will disable the rate limiting.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `APP_DEFAULT_ENABLE_STATS` | `appManager.array.apps.0.enableStats` | `false` | - | Wether statistics should be enabled for the app. Overrides the `APPS_LIST` if set. |
| `APP_DEFAULT_ENABLE_CLIENT_MESSAGES` | `appManager.array.apps.0.enableClientMessages` | `true` | - | Wether client messages should be enabled for the app. Overrides the `APPS_LIST` if set. |
| `APP_DEFAULT_ID` | `appManager.array.apps.0.id` | `echo-app` | - | The default app id for the array driver. Overrides the `APPS_LIST` if set. |
| `APP_DEFAULT_KEY` | `appManager.array.apps.0.key` | `echo-app-key` | - | The default app key for the array driver. Overrides the `APPS_LIST` if set. |
| `APP_DEFAULT_MAX_CONNS` | `apiManager.array.apps.0.maxConnections` | `NaN` | - | The default app's limit of concurrent connections. Overrides the `APPS_LIST` if set. |
| `APP_DEFAULT_MAX_BACKEND_EVENTS_PER_MIN` | `apiManager.array.apps.0.maxBackendEventsPerMinute` | `NaN` | - | The default app's limit of `/events` endpoint events broadcasted per minute. Overrides the `APPS_LIST` if set. You can [configure rate limiting database store](#rate-limiting) |
| `APP_DEFAULT_MAX_CLIENT_EVENTS_PER_MIN` | `apiManager.array.apps.0.maxClientEventsPerMinute` | `NaN` | - | The default app's limit of client events broadcasted per minute, by a single socket. Overrides the `APPS_LIST` if set. You can [configure rate limiting database store](#rate-limiting) |
| `APP_DEFAULT_MAX_READ_REQ_PER_MIN` | `apiManager.array.apps.0.maxReadRequestsPerMinute` | `NaN` | - | The default app's limit of read endpoint calls per minute. Overrides the `APPS_LIST` if set.  You can [configure rate limiting database store](#rate-limiting) |
| `APP_DEFAULT_SECRET` | `appManager.array.apps.0.secret` | `echo-app-secret` | - | The default app secret for the array driver. Overrides the `APPS_LIST` if set. |

### Apps Manager

The apps manager manages the allowed apps to connect to the WS and the API. Defaults to the local, array driver
predefined by the `APP_DEFAULT_*` variables, but you can opt-in for example for an API driver which connects to an
external API in order to retrieve an app, like [soketi/echo-server-core](https://github.com/soketi/echo-server-core) does.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `APPS_LIST` | `appManager.array.apps` | `'[{"id":"echo-app","key":"echo-app-key","secret":"echo-app-secret","maxConnections":"-1","enableStats":false,"enableClientMessages":true,"maxBackendEventsPerMinute":"-1","maxClientEventsPerMinute":"-1","maxReadRequestsPerMinute":"-1"}]'` | - | The list of apps to be used for authentication. |
| `APPS_MANAGER_DRIVER` | `appManager.driver` | `array` | `array`, `api`, `mysql`, `postgres` | The driver used to retrieve the app. Use `api` or other centralized method for storing the data. |
| `APPS_MANAGER_ENDPOINT` | `appManager.api.endpoint` | `/echo-server/app` | - | The endpoint used to retrieve an app. This is for `api` driver. |
| `APPS_MANAGER_HOST` | `appManager.api.host` | `http://127.0.0.1` | - | The host used to make call, alongside with the endpoint, to retrieve apps. It will be passed in the request as `?token=` |
| `APPS_MANAGER_TOKEN` | `appManager.api.token` | `echo-app-token` | - | The token used for any API app manager provider to know the request came from the Node.js server. |

#### SQL-Related Drivers

For SQL-related drivers, a table is needed with a specific configuration. [You can find more about the SQL-Related Drivers int the App Managers documentation](APP_MANAGERS.md#sql-drivers)
#### MySQL

To configure the rest of the MySQL connection details, check [MySQL](#mysql-configuration).

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `APPS_MANAGER_MYSQL_TABLE` | `appManager.mysql.table` | `echo_apps` | - | The table name where the apps will be stored in MySQL. |
| `APPS_MANAGER_MYSQL_VERSION` | `appManager.mysql.version` | `8.0` | - | The MySQL version to be used on the connection. Defaults to latest MySQL (`8.0`) |

#### PostgreSQL

To configure the rest of the PostgreSQL connection details, check [PostgreSQL](#postgresql-configuration).

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `APPS_MANAGER_POSTGRES_TABLE` | `appManager.postgres.table` | `echo_apps` | - | The table name where the apps will be stored in Postgres. |
| `APPS_MANAGER_POSTGRES_VERSION` | `appManager.postgres.version` | `8.0` | - | The Postgres version to be used on the connection. Defaults to latest stable Postgres (`13.3`) |

## Rate Limiting

Rate limiting is helping you limit the access for applications at the app level with [app settings, per se](#default-application).

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `RATE_LIMITER_DRIVER` | `rateLimiter.driver` | `local` | `local`, `redis` | The driver used for rate limiting counting. |

- `local` - Rate limiting is stored within the memory and is lost upon process exit.
- `redis` - Rate limiting is centralized in Redis using the key-value store. Recommended when having a multi-node configuration.

### Events Soft Limits

Beside the rate limiting, you can set soft limits for the incoming data, such as the maximum allowed event size or the maximum event name length.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `EVENT_MAX_CHANNELS_AT_ONCE` | `eventLimits.maxChannelsAtOnce` | `100` | - | The maximum amount of channels that the client can broadcast to from a single `/events` request. |
| `EVENT_MAX_NAME_LENGTH` | `eventLimits.maxNameLength` | `200` | - | The maximum length of the event name that is allowed. |
| `EVENT_MAX_SIZE_IN_KB` | `eventLimits.maxPayloadInKb` | `100` | - | The maximum size, in KB, for the broadcasted payloads incoming from the clients. |


## Channels

### Presence Channel Storage

When dealing with presence channel, connection details must be stored within the app.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `PRESENCE_MAX_MEMBER_SIZE` | `presence.maxMemberSizeInKb` | `2` | - | The maximum member size, in KB, for each member in a presence channel. |
| `PRESENCE_MAX_MEMBERS` | `presence.maxMembersPerChannel` | `100` | - | The maximum amount of members that can simultaneously be connected in a presence channel. |

### Channels Soft Limits

Beside the rate limiting, you can set soft limits for the incoming data, such as the maximum allowed event size or the maximum event name length.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `CHANNEL_MAX_NAME_LENGTH` | `channelLimits.maxNameLength` | `100` | - | The maximum length of the channel name that is allowed. The specific-prefix names are also counted. |

## Statsitics

Statistics are continously being stored and get a snapshot on a given interval.
Statistics are globally enabled by default, but they are disabled on the default app.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `STATS_ENABLED` | `stats.enabled` | `true` | `true`, `false` | Wether to enable the stats store. |
| `STATS_DRIVER` | `stats.driver` | `local` | `local`, `redis-ts`, `promethus` | The stats driver used to store the stats to. |
| `STATS_SNAPSHOTS_INTERVAL` | `stats.snapshots.interval` | `3600` | - | The amount of time to wait between taking stats snapshots, in seconds. |

For non-distributed systems:

- `local` - Stats are stored in-memory. Snapshots are stored in-memory.

For distributed systems:

- `redis-ts` - Stats are stored in [Redis Time Series](https://oss.redislabs.com/redistimeseries/)-compatible database; use `STATS_SNAPSHOTS_INTERVAL` for time bucket between points
- `prometheus` - Stats are read from a Prometheus server REST API (`PROMETHEUS_ENABLED` should be `true` and you should have the Prometheus server scrape metrics from the `/metrics` endpoint); [see Prometheus configuration](#prometheus)). **The scraping service is not provided and you should set up the Prometheus server to scrape `/metrics` in order to be able to read them.**

## Databases

### Redis Configuration

Configuration needed to connect to a Redis server.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `REDIS_HOST` | `database.redis.host` | `127.0.0.1` | - | The Redis host used for `redis` driver. |
| `REDIS_PORT` | `database.redis.port` | `6379` | - | The Redis port used for `redis` driver. |
| `REDIS_PASSWORD` | `database.redis.password` | `null` | - | The Redis password used for `redis` driver. |
| `REDIS_PREFIX` | `database.redis.keyPrefix` | `echo-server` | - | The key prefix for Redis. Only for `redis` driver. |

For [Redis Time Series](https://oss.redislabs.com/redistimeseries), you may use the following variables:

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `REDIS_TS_HOST` | `database.redisTs.host` | `127.0.0.1` | - | The Redis host used for `redis-ts` driver. |
| `REDIS_TS_PORT` | `database.redisTs.port` | `6381` | - | The Redis port used for `redis-ts` driver. |
| `REDIS_TS_PASSWORD` | `database.redisTs.password` | `null` | - | The Redis password used for `redis-ts` driver. |
| `REDIS_TS_PREFIX` | `database.redisTs.keyPrefix` | `echo-server` | - | The key prefix for Redis. Only for `redis-ts` driver. |

### Prometheus Configuration

Echo Server embeds a Prometheus client that can be accessed on the `/metrics` endpoint. It provides data to be scraped by the Prometheus service and includes Socket.IO stats by namespace, as well as the Node.js default metrics.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `PROMETHEUS_ENABLED` | `prometheus.enabled` | `false` | `true`, `false` | Wether to enable `/metrics` endpoint. |
| `PROMETHEUS_PREFIX` | `prometheus.prefix` | `echo_server_` | - | The prefix to append to Prometheus metrics names. |
| `PROMETHEUS_HOST` | `prometheus.host` | `127.0.0.1` | - | The host of the Prometheus server to read statistics from. |
| `PROMETHEUS_PORT` | `prometheus.port` | `9090` | - | The port of the Prometheus server to read statistics from. |
| `PROMETHEUS_PROTOCOL` | `prometheus.protocol` | `http` | `http`, `https` | The protocol of the Prometheus server to read statistics from. |

### MySQL Configuration

Configuration needed to connect to a MySQL server.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `MYSQL_HOST` | `database.mysql.host` | `127.0.0.1` | - | The MySQL host used for `mysql` driver. |
| `MYSQL_PORT` | `database.mysql.port` | `3306` | - | The MySQL port used for `mysql` driver. |
| `MYSQL_USERNAME` | `database.mysql.user` | `root` | - | The MySQL username used for `mysql` driver. |
| `MYSQL_PASSWORD` | `database.mysql.password` | `password` | - | The MySQL password used for `mysql` driver. |
| `MYSQL_DATABASE` | `database.mysql.database` | `main` | - | The MySQL database used for `mysql` driver. |

This database supports [Database Pooling](#database-pooling).

### PostgreSQL Configuration

Configuration needed to connect to a PostgreSQL server.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `POSTGRES_HOST` | `database.postgres.host` | `127.0.0.1` | - | The PostgreSQL host used for `postgres` driver. |
| `POSTGRES_PORT` | `database.postgres.port` | `3306` | - | The PostgreSQL port used for `postgres` driver. |
| `POSTGRES_USERNAME` | `database.postgres.user` | `root` | - | The PostgreSQL username used for `postgres` driver. |
| `POSTGRES_PASSWORD` | `database.postgres.password` | `password` | - | The PostgreSQL password used for `postgres` driver. |
| `POSTGRES_DATABASE` | `database.postgres.database` | `main` | - | The PostgreSQL database used for `postgres` driver. |

This database supports [Database Pooling](#database-pooling).

## Database Pooling

Behind the scenes, the connections to the relational databases are made using [Knex](https://knexjs.org/). In case you are using Connection Pooling in your database,
you can instruct Knex to connect to them via pooling instead of a regular one connection per statement.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `DATABASE_POOLING_ENABLED` | `databasePooling.enabled` | `false` | `true`, `false` | Wether to enable the database pooling. The pooling will be truly enable only if the database suppport pooling in Knex. |
| `DATABASE_POOLING_MIN` | `databasePooling.min` | `0` | - | The minimum amount of connections. |
| `DATABASE_POOLING_MAX` | `databasePooling.max` | `7` | - | The maximum amount of connections. |

## Debugging

Options for application debugging. Should be disabled on production environments.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `CLOSING_GRACE_PERIOD` | `closingGracePeriod` | `60` | - | The amount of time to wait after the server gets closed. This is useful to wait for arbitrary tasks after the sockets disconnect. |
| `DEBUG` | `development` | `false` | `true`, `false` | Weteher the app should be in development mode. |

### Node Metadata

Node settings include assigning identifiers for the running node.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `NODE_ID` | `instance.node_id` | random UUIDv4 string | - | An unique ID given to the node in which the process runs. Used by other features to label data. |
| `POD_ID` | `instance.pod_id` | `null` | - | The Pod name if the app runs in Kubernetes. Used by other features to label data. |
