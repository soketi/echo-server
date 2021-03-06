import { App } from './../app';
import { Options } from './../options';
import { AppsStats, AppSnapshottedPoints, Snapshots, StatsDriver, StatsElement, TimedStatsElement } from './stats-driver';
import * as dot from 'dot-wild';

const dayjs = require('dayjs');

export class LocalStats implements StatsDriver {
    /**
     * The stored stats.
     *
     * @type {Stats}
     */
    protected stats: AppsStats = {
        //
    };

    /**
     * The stored snapshots, keyed by time.
     *
     * @type {Snapshots}
     */
    protected snapshots: Snapshots = {
        //
    };

    /**
     * The list of apps that registered metrics.
     *
     * @type {string[]}
     */
    protected registeredApps: string[] = [
        //
    ];

    /**
     * Initialize the local stats driver.
     */
    constructor(protected options: Options) {
        //
    }

    /**
     * Mark in the stats a new connection.
     * Returns a number within a promise.
     */
    markNewConnection(app: App): Promise<number> {
        if (!this.canRegisterStats(app)) {
            return new Promise(resolve => resolve(0));
        }

        return this.registerApp(app).then(() => {
            return this.increment(app, 'connections').then(connections => {
                let peakConnections = Math.max(
                    this.stats[app.key]['peak_connections'] || 0,
                    connections,
                );

                return this.set(app, 'peak_connections', peakConnections).then(() => connections);
            });
        });
    }

    /**
     * Mark in the stats a socket disconnection.
     * Returns a number within a promise.
     */
    markDisconnection(app: App, reason?: string): Promise<number> {
        if (!this.canRegisterStats(app)) {
            return new Promise(resolve => resolve(0));
        }

        return this.registerApp(app).then(() => {
            return this.decrement(app, 'connections');
        });
    }

    /**
     * Mark in the stats a new API message.
     * Returns a number within a promise.
     */
    markApiMessage(app: App): Promise<number> {
        if (!this.canRegisterStats(app)) {
            return new Promise(resolve => resolve(0));
        }

        return this.registerApp(app).then(() => {
            return this.increment(app, 'api_messages');
        });
    }

    /**
     * Mark in the stats a whisper message.
     * Returns a number within a promise.
     */
    markWsMessage(app: App): Promise<number> {
        if (!this.canRegisterStats(app)) {
            return new Promise(resolve => resolve(0));
        }

        return this.registerApp(app).then(() => {
            return this.increment(app, 'ws_messages');
        });
    }

    /**
     * Get the compiled stats for a given app.
     */
    getStats(app: App|string|number): Promise<StatsElement> {
        let appKey = app instanceof App ? app.key : app;

        return new Promise(resolve => {
            resolve({
                connections: this.stats[appKey] ? (this.stats[appKey]['connections'] || 0) : 0,
                peak_connections: this.stats[appKey] ? (this.stats[appKey]['peak_connections'] || 0) : 0,
                api_messages: this.stats[appKey] ? (this.stats[appKey]['api_messages'] || 0) : 0,
                ws_messages: this.stats[appKey] ? (this.stats[appKey]['ws_messages'] || 0) : 0,
            });
        });
    }

    /**
     * Take a snapshot of the current stats
     * for a given time.
     */
    takeSnapshot(app: App|string|number, time?: number): Promise<TimedStatsElement> {
        let appKey = app instanceof App ? app.key : app;

        if (!this.snapshots[appKey]) {
            this.snapshots[appKey] = {
                connections: { points: [] },
                api_messages: { points: [] },
                ws_messages: { points: [] },
            };
        }

        return this.getStats(app).then((stats: StatsElement) => {
            this.snapshots[appKey].connections.points.push({
                time,
                avg: stats.connections,
                max: stats.peak_connections,
            });

            this.snapshots[appKey].api_messages.points.push({
                time,
                value: stats.api_messages,
            });

            this.snapshots[appKey].ws_messages.points.push({
                time,
                value: stats.ws_messages,
            });

            return {
                time,
                stats,
            };
        }).then((record: TimedStatsElement) => {
            return this.hasActivity(app).then(hasActivity => {
                if (!hasActivity) {
                    return this.resetAppTraces(app).then(() => record);
                }

                /**
                 * Reset the messages stats to 0 only
                 * if the app still has activity.
                 */
                this.resetMessagesStats(app);

                return record;
            });
        });
    }

    /**
     * Get the list of stats snapshots for a given interval.
     * Defaults to the last 7 days.
     */
    getSnapshots(app: App|string|number, start?: number, end?: number): Promise<AppSnapshottedPoints> {
        let appKey = app instanceof App ? app.key : app;

        start = start ? start : dayjs().subtract(7, 'day').unix();
        end = end ? end : dayjs().unix();

        return new Promise(resolve => resolve(this.snapshots[appKey]));
    }

    /**
     * Delete points that are outside of the desired range
     * of keeping the history of.
     */
    deleteStalePoints(app: App|string|number, time?: number): Promise<boolean> {
        let appKey = app instanceof App ? app.key : app;

        let pointDeletionCheck = point => point.time >= (time - this.options.stats.retention.period);

        return this.getSnapshots(app, 0, Infinity).then(snapshots => {
            this.snapshots[appKey].connections.points = snapshots.connections.points.filter(pointDeletionCheck);
            this.snapshots[appKey].api_messages.points = snapshots.api_messages.points.filter(pointDeletionCheck);
            this.snapshots[appKey].ws_messages.points = snapshots.ws_messages.points.filter(pointDeletionCheck);

            return true;
        }).then(() => true);
    }

    /**
     * Register the app to know we have metrics for it.
     */
    registerApp(app: App|string|number): Promise<boolean> {
        let appKey = app instanceof App ? app.key : app;

        return new Promise(resolve => {
            if (this.registeredApps.indexOf(appKey.toString()) === -1) {
                this.registeredApps.push(appKey.toString());
            }

            resolve(true);
        });
    }

    /**
     * Get the list of registered apps into stats.
     */
    getRegisteredApps(): Promise<string[]> {
        return new Promise(resolve => resolve(this.registeredApps));
    }

    /**
     * Increment a given stat.
     */
    protected increment(app: App, stat: string): Promise<number> {
        return new Promise(resolve => {
            if (!this.canRegisterStats(app)) {
                return resolve(0);
            }

            if (dot.has(this.stats, `${app.key}.${stat}`)) {
                this.stats[app.key][stat]++;
                resolve(this.stats[app.key][stat]);
            } else {
                this.stats = dot.set(this.stats, `${app.key}.${stat}`, 1);
                resolve(1);
            }
        });
    }

    /**
     * Decrement a given stat.
     */
    protected decrement(app: App, stat: string): Promise<number> {
        return new Promise(resolve => {
            if (!this.canRegisterStats(app)) {
                return resolve(0);
            }

            if (dot.has(this.stats, `${app.key}.${stat}`) && this.stats[app.key][stat] > 0) {
                this.stats[app.key][stat]--;
                resolve(this.stats[app.key][stat]);
            } else {
                this.stats = dot.set(this.stats, `${app.key}.${stat}`, 0);
                resolve(0);
            }
        });
    }

    /**
     * Set a metric to a certain number.
     */
    protected set(app: App, stat: string, value: number): Promise<number> {
        return new Promise(resolve => {
            if (!this.canRegisterStats(app)) {
                return resolve(0);
            }

            this.stats[app.key][stat] = value;

            resolve(value);
        });
    }

    /**
     * Reset the messages counters after each snapshot.
     */
    protected resetMessagesStats(app: App|string|number): void {
        let appKey = app instanceof App ? app.key : app;

        this.stats[appKey]['api_messages'] = 0;
        this.stats[appKey]['ws_messages'] = 0;
        this.stats[appKey]['peak_connections'] = this.stats[appKey]['connections'] || 0;
    }

    /**
     * Reset all app traces from the stats system.
     */
    protected resetAppTraces(app: App|string|number): Promise<boolean> {
        return new Promise(resolve => {
            let appKey = app instanceof App ? app.key : app;

            delete this.stats[appKey];
            delete this.snapshots[appKey];

            this.registeredApps.splice(this.registeredApps.indexOf(appKey.toString()), 1);

            resolve(true);
        });
    }

    /**
     * Check if the app still has activity.
     */
    protected hasActivity(app: App|string|number): Promise<boolean> {
        return this.getSnapshots(app, 0, Infinity).then(snapshots => {
            return snapshots.connections.points.length > 0 ||
                snapshots.api_messages.points.length > 0 ||
                snapshots.ws_messages.points.length > 0;
        });
    }

    /**
     * Check if the given app can register stats.
     */
    protected canRegisterStats(app: App): boolean {
        return this.options.stats.enabled && !!app.enableStats;
    }
}
