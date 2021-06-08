import { App } from './../app';
import { AppSnapshottedPoints, StatsDriver, StatsElement, TimedStatsElement } from './stats-driver';
import { LocalStats } from './local-stats';
import { Log } from './../log';
import { Options } from './../options';
import { PrometheusStats } from './prometheus-stats';
import { RedisTimeSeriesStats } from './redis-ts-stats';

export class Stats implements StatsDriver {
    /**
     * Stats driver.
     *
     * @type {StatsDriver}
     */
    protected driver: StatsDriver;

    /**
     * Initialize the stats driver.
     */
    constructor(protected options: Options) {
        if (options.stats.driver === 'local') {
            this.driver = new LocalStats(options);
        } else if (options.stats.driver === 'redis-ts') {
            this.driver = new RedisTimeSeriesStats(options);
        } else if (options.stats.driver === 'prometheus') {
            this.driver = new PrometheusStats(options);
        } else {
            Log.error('No stats driver specified.');
        }
    }

    /**
     * Mark in the stats a new connection.
     * Returns a number within a promise.
     */
    markNewConnection(app: App): Promise<number> {
        return this.driver.markNewConnection(app);
    }

    /**
     * Mark in the stats a socket disconnection.
     * Returns a number within a promise.
     */
    markDisconnection(app: App, reason?: string): Promise<number> {
        return this.driver.markDisconnection(app, reason);
    }

    /**
     * Mark in the stats a new API message.
     * Returns a number within a promise.
     */
    markApiMessage(app: App): Promise<number> {
        return this.driver.markApiMessage(app);
    }

    /**
     * Mark in the stats a whisper message.
     * Returns a number within a promise.
     */
    markWsMessage(app: App): Promise<number> {
        return this.driver.markWsMessage(app);
    }

    /**
     * Get the compiled stats for a given app.
     */
    getStats(app: App|string|number): Promise<StatsElement> {
        return this.driver.getStats(app);
    }

    /**
     * Take a snapshot of the current stats
     * for a given time.
     */
    takeSnapshot(app: App|string|number, time?: number): Promise<TimedStatsElement> {
        return this.driver.takeSnapshot(app, time);
    }

    /**
     * Get the list of stats snapshots for a given interval.
     * Defaults to the last 7 days.
     */
    getSnapshots(app: App|string|number, start?: number, end?: number): Promise<AppSnapshottedPoints> {
        return this.driver.getSnapshots(app, start, end);
    }

    /**
     * Delete points that are outside of the desired range
     * of keeping the history of.
     */
    deleteStalePoints(app: App|string|number, time?: number): Promise<boolean> {
        return this.driver.deleteStalePoints(app, time);
    }

    /**
     * Register the app to know we have metrics for it.
     */
    registerApp(app: App|string|number): Promise<boolean>{
        return this.driver.registerApp(app);
    }

    /**
     * Get the list of registered apps into stats.
     */
    getRegisteredApps(): Promise<string[]>{
        return this.driver.getRegisteredApps();
    }
}
