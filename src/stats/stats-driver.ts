import { App } from './../app';

export interface StatsDriver {
    /**
     * Mark in the stats a new connection.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    markNewConnection(app: App): Promise<number>;

    /**
     * Mark in the stats a socket disconnection.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @param  {string|null}  reason
     * @return {Promise<number>}
     */
    markDisconnection(app: App, reason?: string): Promise<number>;

    /**
     * Mark in the stats a new API message.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    markApiMessage(app: App): Promise<number>;

    /**
     * Mark in the stats a whisper message.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    markWsMessage(app: App): Promise<number>;

    /**
     * Get the compiled stats for a given app.
     *
     * @param  {App|string|number}  app
     * @return {Promise<StatsElement>}
     */
    getStats(app: App|string|number): Promise<StatsElement>;

    /**
     * Take a snapshot of the current stats
     * for a given time.
     *
     * @param  {App|string|number}  app
     * @param  {number|null}  time
     * @return {Promise<TimedStatsElement>}
     */
    takeSnapshot(app: App|string|number, time?: number): Promise<TimedStatsElement>;

    /**
     * Get the list of stats snapshots
     * for a given interval.
     * Defaults to the last 7 days.
     *
     * @param  {App|string|number}  app
     * @param  {number|null}  start
     * @param  {number|null}  end
     * @return {Promise<AppSnapshottedPoints>}
     */
    getSnapshots(app: App|string|number, start?: number, end?: number): Promise<AppSnapshottedPoints>;

    /**
     * Delete points that are outside of the desired range
     * of keeping the history of.
     *
     * @param  {App|string|number}  app
     * @param  {number|null}  time
     * @return {Promise<boolean>}
     */
    deleteStalePoints(app: App|string|number, time?: number): Promise<boolean>;

    /**
     * Register the app to know we have metrics for it.
     *
     * @param  {App|string|number}  app
     * @return {Promise<boolean>}
     */
    registerApp(app: App|string|number): Promise<boolean>;

    /**
     * Get the list of registered apps into stats.
     *
     * @return {Promise<string[]>}
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
