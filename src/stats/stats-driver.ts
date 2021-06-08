import { App } from './../app';

export interface StatsDriver {
    /**
     * Mark in the stats a new connection.
     * Returns a number within a promise.
     */
    markNewConnection(app: App): Promise<number>;

    /**
     * Mark in the stats a socket disconnection.
     * Returns a number within a promise.
     */
    markDisconnection(app: App, reason?: string): Promise<number>;

    /**
     * Mark in the stats a new API message.
     * Returns a number within a promise.
     */
    markApiMessage(app: App): Promise<number>;

    /**
     * Mark in the stats a whisper message.
     * Returns a number within a promise.
     */
    markWsMessage(app: App): Promise<number>;

    /**
     * Get the compiled stats for a given app.
     */
    getStats(app: App|string|number): Promise<StatsElement>;

    /**
     * Take a snapshot of the current stats
     * for a given time.
     */
    takeSnapshot(app: App|string|number, time?: number): Promise<TimedStatsElement>;

    /**
     * Get the list of stats snapshots for a given interval.
     * Defaults to the last 7 days.
     */
    getSnapshots(app: App|string|number, start?: number, end?: number): Promise<AppSnapshottedPoints>;

    /**
     * Delete points that are outside of the desired range
     * of keeping the history of.
     */
    deleteStalePoints(app: App|string|number, time?: number): Promise<boolean>;

    /**
     * Register the app to know we have metrics for it.
     */
    registerApp(app: App|string|number): Promise<boolean>;

    /**
     * Get the list of registered apps into stats.
     */
    getRegisteredApps(): Promise<string[]>;
}

export interface StatsElement {
    connections?: number;
    peak_connections?: number;
    api_messages?: number;
    ws_messages?: number;
}

export interface AppsStats {
    [key: string]: StatsElement;
}

export interface TimedStatsElement {
    time?: string|number;
    stats: StatsElement;
}

export interface SnapshotPoint {
    time?: number|string;
    avg?: number|string;
    max?: number|string;
    value?: number|string;
}

export interface AppSnapshottedPoints {
    connections: { points: SnapshotPoint[] };
    api_messages: { points: SnapshotPoint[] };
    ws_messages: { points: SnapshotPoint[] };
}

export interface Snapshots {
    [key: string]: AppSnapshottedPoints;
}
