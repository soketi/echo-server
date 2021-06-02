- [Basic Environment Variables](#basic-environment-variables)
  - [Socket.IO Settings](#socketio-settings)
  - [SSL Settings](#ssl-settings)
  - [Node Settings](#node-settings)
  - [Default Application](#default-application)
  - [Apps Manager](#apps-manager)
  - [CORS Settings](#cors-settings)
  - [Replication](#replication)
  - [Presence Channel Storage](#presence-channel-storage)
  - [Debugging](#debugging)
  - [Rate Limiting](#rate-limiting)
  - [Statsitics](#statsitics)
- [Databases](#databases)
  - [Redis](#redis)
  - [Prometheus](#prometheus)

# Basic Environment Variables

## Socket.IO Settings

Configuration needed to specify the protocol, port and host for the server.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `SOCKET_HOST` | `host` | `null` | - | The host used for Socket.IO |
| `SOCKET_PORT` | `port` | `6001` | - | The port used for Socket.IO |
| `SOCKET_PROTOCOL` | `protocol` | `http` | `http`, `https` | The protocol used for the Socket.IO. |
| `HTTP_PROTOCOL` | `httpApi.protocol` | `http` | `http`, `https` | The protocol used for the HTTP API. |
| `HTTP_TRUST_PROXIES` | `trustProxies` | `false` | `true`, `false` | Wether to trust proxies at the HTTP API level. |
| `EXTRA_HEADERS` | `httpApi.extraHeaders` | `[]` | - | Extra headers to attach to HTTP API responses. |
| `HTTP_MAX_PAYLOAD_SIZE` | `httpApi.payload.payloadLimitInKb` | `100` | - | The maximum size, in KB, for the broadcasted payloads incoming from the clients. Set this according to your needs. |
| `HTTP_MAX_REQUEST_SIZE` | `httpApi.payload.requestLimitInMb` | `100` | - | The maximum size, in MB, for the total size of the request. A hard limit has been set to 100 MB. |

## SSL Settings

If the Socket.IO protocol is `https`, SSL settings can be applied with the following variables.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `SSL_CERT` | `ssl.certPath` | `''` | - | The path for SSL certificate file. |
| `SSL_KEY` | `ssl.keyPath` | `''` | - | The path for SSL key file. |
| `SSL_CA` | `ssl.caPath` | `''` | - | The path for CA certificate file. |
| `SSL_PASS` | `ssl.passphrase` | `''` | - | The passphrase for the SSL key file. |


## Node Settings

Node settings include assigning identifiers for the running node.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `NODE_ID` | `instance.node_id` | random UUIDv4 string | - | An unique ID given to the node in which the process runs. Used by other features to label data. |
| `POD_ID` | `instance.pod_id` | `null` | - | The Pod name if the app runs in Kubernetes. Used by other features to label data. |

## Default Application

By default, the app is using a predefined list of applications to allow access.
In case you opt-in for another `APP_MANAGER_DRIVER`, these are the variables you can change in order to change the app settings.

For the rate limiting options, setting limits to `-1` will disable the rate limiting.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `APP_DEFAULT_ENABLE_STATS` | `appManager.array.apps.0.enableStats` | `false` | - | Wether statistics should be enabled for the app. Overrides the `APPS_LIST` if set. |
| `APP_DEFAULT_ID` | `appManager.array.apps.0.id` | `echo-app` | - | The default app id for the array driver. Overrides the `APPS_LIST` if set. |
| `APP_DEFAULT_KEY` | `appManager.array.apps.0.key` | `echo-app-key` | - | The default app key for the array driver. Overrides the `APPS_LIST` if set. |
| `APP_DEFAULT_MAX_CONNS` | `apiManager.array.apps.0.maxConnections` | `NaN` | - | The default app's limit of concurrent connections. Overrides the `APPS_LIST` if set. |
| `APP_DEFAULT_MAX_BACKEND_EVENTS_PER_MIN` | `apiManager.array.apps.0.maxBackendEventsPerMinute` | `NaN` | - | The default app's limit of `/events` endpoint events broadcasted per minute. Overrides the `APPS_LIST` if set. You can [configure rate limiting database store](#rate-limiting) |
| `APP_DEFAULT_MAX_CLIENT_EVENTS_PER_MIN` | `apiManager.array.apps.0.maxClientEventsPerMinute` | `NaN` | - | The default app's limit of client events broadcasted per minute, by a single socket. Overrides the `APPS_LIST` if set. You can [configure rate limiting database store](#rate-limiting) |
| `APP_DEFAULT_MAX_READ_REQ_PER_MIN` | `apiManager.array.apps.0.maxReadRequestsPerMinute` | `NaN` | - | The default app's limit of read endpoint calls per minute. Overrides the `APPS_LIST` if set.  You can [configure rate limiting database store](#rate-limiting) |
| `APP_DEFAULT_SECRET` | `appManager.array.apps.0.secret` | `echo-app-secret` | - | The default app secret for the array driver. Overrides the `APPS_LIST` if set. |

## Apps Manager

The apps manager manages the allowed apps to connect to the WS and the API. Defaults to the local, array driver
predefined by the `APP_DEFAULT_*` variables, but you can opt-in for example for an API driver which connects to an
external API in order to retrieve an app, like [soketi/echo-server-core](https://github.com/soketi/echo-server-core) does.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `APPS_LIST` | `appManager.array.apps` | `'[{"id":"echo-app","key":"echo-app-key","secret":"echo-app-secret","maxConnections":"-1","enableStats":false,"maxBackendEventsPerMinute":"-1","maxClientEventsPerMinute":"-1","maxReadRequestsPerMinute":"-1"}]'` | - | The list of apps to be used for authentication. |
| `APPS_MANAGER_DRIVER` | `appManager.driver` | `array` | `array`, `api` | The driver used to retrieve the app. Use `api` or other centralized method for storing the data. |
| `APPS_MANAGER_ENDPOINT` | `appManager.api.endpoint` | `/echo-server/app` | - | The endpoint used to retrieve an app. This is for `api` driver. |
| `APPS_MANAGER_HOST` | `appManager.api.host` | `http://127.0.0.1` | - | The host used to make call, alongside with the endpoint, to retrieve apps. It will be passed in the request as `?token=` |
| `APPS_MANAGER_TOKEN` | `appManager.api.token` | `echo-app-token` | - | The token used for any API app manager provider to know the request came from the Node.js server. |

## CORS Settings

A per-app CORS setting exists, but you can opt for global check for allowed origins. Defaults to all (`*`).

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `CORS_ALLOWED_ORIGINS` | `cors.origin` | `["*"]` | - | The array of allowed origins that can connect to the WS. |

## Replication

For local, single-instance applications, no replication is needed. However, to store presence channel data members replication is needed
in order to be able to scale up the Echo Server instances.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `REPLICATION_DRIVER` | `replication.driver` | `local` | `redis`, `local` | The database driver for storing socket data. Use `local` only for single-node, single-process instances. |

- `redis` - Enabled Pub/Sub communication between processes/nodes, can be scaled horizontally without issues.
- `local` - There is no communication or Pub/Sub. Recommended for single-instance, single-process apps.

## Presence Channel Storage

When dealing with presence channel, connection details must be stored within the app.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `PRESENCE_MAX_MEMBER_SIZE` | `presence.maxMemberSizeInKb` | `2` | - | The maximum member size, in KB, for each member in a presence channel. |
| `PRESENCE_MAX_MEMBERS` | `presence.maxMembersPerChannel` | `100` | - | The maximum amount of members that can simultaneously be connected in a presence channel. |
| `PRESENCE_STORAGE_DATABASE` | `presence.storage.database` | `socket` | `redis`, `socket` | The database driver for storing presence channel data. |

- `redis` - Presence channels members are stored in key-value store.
- `socket` - Presence channels members are stored locally, in-memory, in each socket connection. Also works with the multi-node configuration.

## Debugging

Options for application debugging. Should be disabled on production environments.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `CLOSING_GRACE_PERIOD` | `closingGracePeriod` | `60` | - | The amount of time to wait after the server gets closed. This is useful to wait for arbitrary tasks after the sockets disconnect. |
| `DEBUG` | `development` | `false` | `true`, `false` | Weteher the app should be in development mode. |

## Rate Limiting

Rate limiting is helping you limit the access for applications at the app level with [app settings, per se](#default-application).

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `RATE_LIMITER_DRIVER` | `rateLimiter.driver` | `local` | `local`, `redis` | The driver used for rate limiting counting. |

- `local` - Rate limiting is stored within the memory and is lost upon process exit.
- `redis` - Rate limiting is centralized in Redis using the key-value store. Recommended when having a multi-node configuration.

## Statsitics

Statistics are continously being stored and get a snapshot on a given interval.
Statistics are globally enabled by default, but they are disabled on the default app.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `STATS_ENABLED` | `stats.enabled` | `true` | `true`, `false` | Wether to enable the stats store. |
| `STATS_DRIVER` | `stats.driver` | `local` | `local`, `redis-ts`, `promethus` | The stats driver used to store the stats to. |
| `STATS_SNAPSHOTS_INTERVAL` | `stats.snapshots.interval` | `60 * 60` | - | The amount of time to wait between taking stats snapshots, in seconds. |

For non-distributed systems:

- `local` - Stats are stored in-memory. Snapshots are stored in-memory.

For distributed systems:

- `redis-ts` - Stats are stored in [Redis Time Series](https://oss.redislabs.com/redistimeseries/)-compatible database; use `STATS_SNAPSHOTS_INTERVAL` for time bucket between points
- `prometheus` - Stats are read from a Prometheus server REST API (`PROMETHEUS_ENABLED` should be `true` and you should have the Prometheus server scrape metrics from the `/metrics` endpoint); [see Prometheus configuration](#prometheus))

**The scraping service is not provided and you should set up the Prometheus server to scrape `/metrics` in order to be able to read them.**

# Databases

## Redis

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

## Prometheus

Echo Server embeds a Prometheus client that can be accessed on the `/metrics` endpoint. It provides data to be scraped by the Prometheus service and includes Socket.IO stats by namespace, as well as the Node.js default metrics.

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `PROMETHEUS_ENABLED` | `prometheus.enabled` | `false` | `true`, `false` | Wether to enable `/metrics` endpoint. |
| `PROMETHEUS_PREFIX` | `prometheus.prefix` | `echo_server_` | - | The prefix to append to Prometheus metrics names. |
| `PROMETHEUS_HOST` | `prometheus.host` | `127.0.0.1` | - | The host of the Prometheus server to read statistics from. |
| `PROMETHEUS_PORT` | `prometheus.port` | `9090` | - | The port of the Prometheus server to read statistics from. |
| `PROMETHEUS_PROTOCOL` | `prometheus.protocol` | `http` | `http`, `https` | The protocol of the Prometheus server to read statistics from. |
