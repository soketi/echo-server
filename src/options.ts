import { AppInterface } from './app';

interface Redis {
    host: string;
    port: number;
    password: string|null;
    keyPrefix: string;
}

interface KnexConnection {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
}

export interface Options {
    appManager: {
        driver: string;
        api: {
            host: string;
            endpoint: string;
            token: string;
        };
        array: {
            apps: AppInterface[],
        };
        mysql: {
            table: string;
            version: string|number;
        };
        postgres: {
            table: string;
            version: string|number;
        };
    };
    channelLimits: {
        maxNameLength: number;
    };
    closingGracePeriod: number;
    cors: {
        credentials: boolean;
        origin: string[];
        methods: string[];
        allowedHeaders: string[];
    };
    database: {
        redis: Redis;
        redisTs: Redis;
        mysql: KnexConnection;
        postgres: KnexConnection;
        local: {};
        prometheus: {
            host: string;
            port: number;
            protocol: string;
        };
    };
    databasePooling: {
        enabled: boolean;
        min: number;
        max: number;
    };
    development: boolean;
    eventLimits: {
        maxChannelsAtOnce: string|number;
        maxNameLength: string|number;
        maxPayloadInKb: string|number;
    };
    host: null|string;
    httpApi: {
        extraHeaders: { [key: string]: string|number; },
        protocol: string;
        requestLimitInMb: string|number;
        trustProxies: boolean;
    };
    instance: {
        node_id: string|number|null;
        process_id: string|number;
        pod_id: string|number|null;
    };
    port: number;
    presence: {
        storage: {
            database: string;
        };
        maxMembersPerChannel: string|number;
        maxMemberSizeInKb: string|number;
    };
    prometheus: {
        enabled: boolean;
        prefix: string;
    };
    rateLimiter: {
        driver: string;
    };
    replication: {
        driver: string;
    };
    secureOptions: Options;
    socketIoOptions: { [key:string]: any; };
    ssl: {
        certPath: string;
        keyPath: string;
        caPath: string;
        passphrase: string|null;
    };
    stats: {
        enabled: boolean;
        driver: string;
        snapshots: {
            interval: number;
        };
        retention: {
            period: number;
        };
    };

    cert?: string;
    key?: string;
    ca?: string;
    passphrase?: string|null;

    [key: string]: any;
}
