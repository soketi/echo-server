export interface ApiAppManager {
    host: string;
    endpoint: string;
    token: any;
}

export interface App {
    id: any;
    key: any;
    secret: any;
    maxConnections: number;
    enableStats: boolean;
}

export interface ArrayAppManager {
    apps: App[];
}

export interface AppManager {
    driver: string;
    api: ApiAppManager;
    array: ArrayAppManager;
}

export interface Cors {
    credentials: boolean;
    origin: string[];
    methods: string[];
    allowedHeaders: string[];
}

export interface Database {
    redis: RedisDatabase;
    redisTs: RedisDatabase;
}

export interface RedisDatabase {
    host: string;
    port: number;
    password: any;
    keyPrefix: string;
}

export interface PresenceStorage {
    database: string;
}

export interface Presence {
    storage: PresenceStorage;
}

export interface Prometheus {
    enabled: boolean;
    prefix: string|null;
}

export interface Replication {
    driver: string;
}

export interface Ssl {
    certPath: string;
    keyPath: string;
    caPath: string;
    passphrase: any;
}

export interface StatsSnapshots {
    interval: number;
}

export interface StatsRetention {
    period: number;
}

export interface Stats {
    enabled: boolean;
    driver: string;
    snapshots: StatsSnapshots;
    retention: StatsRetention;
}

export interface Options {
    appManager: AppManager;
    closingGracePeriod: number;
    cors: Cors;
    database: Database;
    development: boolean;
    host: string|null;
    headers: any[];
    port: number;
    presence: Presence;
    prometheus: Prometheus;
    protocol: string;
    replication: Replication;
    secureOptions: any;
    socketIoOptions: any;
    ssl: Ssl;
    stats: Stats;
}
