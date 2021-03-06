import * as dot from 'dot-wild';
import { Options } from './../options';

const echo = require('./../../dist');

export class Cli {
    /**
     * Default configuration options.
     *
     * @type {any}
     */
    options: Options;

    /**
     * Create new CLI instance.
     */
    constructor() {
        this.options = echo.options;
    }

    /**
     * Allowed environment variables.
     *
     * @type {any}
     */
    envVariables: { [key: string]: string; } = {
        APP_DEFAULT_ENABLE_STATS: 'appManager.array.apps.0.enableStats',
        APP_DEFAULT_ENABLE_CLIENT_MESSAGES: 'appManager.array.apps.0.enableClientMessages',
        APP_DEFAULT_ID: 'appManager.array.apps.0.id',
        APP_DEFAULT_KEY: 'appManager.array.apps.0.key',
        APP_DEFAULT_MAX_CONNS: 'appManager.array.apps.0.maxConnections',
        APP_DEFAULT_MAX_BACKEND_EVENTS_PER_MIN: 'appManager.array.apps.0.maxBackendEventsPerMinute',
        APP_DEFAULT_MAX_CLIENT_EVENTS_PER_MIN: 'appManager.array.apps.0.maxClientEventsPerMinute',
        APP_DEFAULT_MAX_READ_REQ_PER_MIN: 'appManager.array.apps.0.maxReadRequestsPerMinute',
        APP_DEFAULT_SECRET: 'appManager.array.apps.0.secret',
        APPS_LIST: 'appManager.array.apps',
        APPS_MANAGER_DRIVER: 'appManager.driver',
        APPS_MANAGER_ENDPOINT: 'appManager.api.endpoint',
        APPS_MANAGER_HOST: 'appManager.api.host',
        APPS_MANAGER_TOKEN: 'appManager.api.token',
        APPS_MANAGER_MYSQL_TABLE: 'appManager.mysql.table',
        APPS_MANAGER_MYSQL_VERSION: 'appManager.mysql.version',
        APPS_MANAGER_POSTGRES_TABLE: 'appManager.postgres.table',
        APPS_MANAGER_POSTGRES_VERSION: 'appManager.postgres.version',
        CHANNEL_MAX_NAME_LENGTH: 'channelLimits.maxNameLength',
        CLOSING_GRACE_PERIOD: 'closingGracePeriod',
        CORS_ALLOWED_ORIGINS: 'cors.origin',
        DATABASE_POOLING_ENABLED: 'databasePooling.enabled',
        DATABASE_POOLING_MIN: 'databasePooling.min',
        DATABASE_POOLING_MAX: 'databasePooling.max',
        DEBUG: 'development',
        EVENT_MAX_CHANNELS_AT_ONCE: 'eventLimits.maxChannelsAtOnce',
        EVENT_MAX_NAME_LENGTH: 'eventLimits.maxNameLength',
        EVENT_MAX_SIZE_IN_KB: 'eventLimits.maxPayloadInKb',
        HTTP_EXTRA_HEADERS: 'httpApi.extraHeaders',
        HTTP_MAX_REQUEST_SIZE: 'httpApi.requestLimitInMb',
        HTTP_PROTOCOL: 'httpApi.protocol',
        HTTP_TRUST_PROXIES: 'httpApi.trustProxies',
        MYSQL_HOST: 'database.mysql.host',
        MYSQL_PORT: 'database.mysql.port',
        MYSQL_USERNAME: 'database.mysql.user',
        MYSQL_PASSWORD: 'database.mysql.password',
        MYSQL_DATABASE: 'database.mysql.database',
        NODE_ID: 'instance.node_id',
        POD_ID: 'instance.pod_id',
        PRESENCE_MAX_MEMBER_SIZE: 'presence.maxMemberSizeInKb',
        PRESENCE_MAX_MEMBERS: 'presence.maxMembersPerChannel',
        PROMETHEUS_ENABLED: 'prometheus.enabled',
        PROMETHEUS_PREFIX: 'prometheus.prefix',
        PROMETHEUS_HOST: 'prometheus.host',
        PROMETHEUS_PORT: 'prometheus.port',
        PROMETHEUS_PROTOCOL: 'prometheus.protocol',
        POSTGRES_HOST: 'database.postgres.host',
        POSTGRES_PORT: 'database.postgres.port',
        POSTGRES_USERNAME: 'database.postgres.user',
        POSTGRES_PASSWORD: 'database.postgres.password',
        POSTGRES_DATABASE: 'database.postgres.database',
        RATE_LIMITER_DRIVER: 'rateLimiter.driver',
        REPLICATION_DRIVER: 'replication.driver',
        REDIS_HOST: 'database.redis.host',
        REDIS_PORT: 'database.redis.port',
        REDIS_PASSWORD: 'database.redis.password',
        REDIS_PREFIX: 'database.redis.keyPrefix',
        SOCKET_HOST: 'host',
        SOCKET_PORT: 'port',
        SOCKET_PROTOCOL: 'protocol',
        SSL_CERT: 'ssl.certPath',
        SSL_KEY: 'ssl.keyPath',
        SSL_CA: 'ssl.caPath',
        SSL_PASS: 'ssl.passphrase',
        STATS_ENABLED: 'stats.enabled',
        STATS_DRIVER: 'stats.driver',
        STATS_SNAPSHOTS_INTERVAL: 'stats.snapshots.interval',
        STATS_RETENTION_PERIOD: 'stats.retention.period',
    };

    /**
     * Inject the .env vars into options if they exist.
     */
    protected overwriteOptionsFromEnv(): void {
        require('dotenv').config();

        for (let envVar in this.envVariables) {
            let value = process.env[envVar] || process.env[`ECHO_SERVER_${envVar}`] || null;
            let optionKey = this.envVariables[envVar.replace('ECHO_SERVER_', '')];

            if (value !== null) {
                let json = null;

                if (typeof value === 'string') {
                    try {
                        json = JSON.parse(value);
                    } catch (e) {
                        json = null;
                    }

                    if (json !== null) {
                        value = json;
                    }
                }

                this.options = dot.set(this.options, optionKey, value);
            }
        }
    }

    /**
     * Start the Echo server.
     */
    start(yargs: any): Promise<any> {
        this.overwriteOptionsFromEnv();

        const handleFailure = async () => {
            await echo.stop();
            process.exit();
        }

        process.on('SIGINT', handleFailure);
        process.on('SIGHUP', handleFailure);
        process.on('SIGTERM', handleFailure);

        return echo.start(this.options);
    }

    /**
     * Stop the server.
     */
    stop(): Promise<void> {
        return echo.stop();
    }
}
