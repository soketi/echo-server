import { App } from './../app';
import { StatsDriver } from './stats-driver';
import {
    Aggregation,
    AggregationType,
    FilterBuilder,
    Label,
    RedisTimeSeriesFactory,
    Sample,
    TimestampRange,
} from 'redis-time-series-ts';

const dayjs = require('dayjs');
const Redis = require('ioredis');

export class RedisTimeSeriesStats implements StatsDriver {
    /**
     * The Redis.IO client for TimeSeries.
     *
     * @type {any}
     */
    protected redisTimeSeries: any;

    /**
     * The Redis.IO client.
     *
     * @type {Redis}
     */
     protected redis: typeof Redis;

    /**
     * Initialize the Redis stats driver.
     *
     * @param {any} options
     */
    constructor(protected options: any) {
        this.redisTimeSeries = (new RedisTimeSeriesFactory(options.database.redisTs)).create();
        this.redis = new Redis(options.database.redisTs);
    }

    /**
     * Mark in the stats a new connection.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    markNewConnection(app: App): Promise<number> {
        if (!this.canRegisterStats(app)) {
            return new Promise(resolve => resolve(0));
        }

        let appKey = app instanceof App ? app.key : app;

        return this.registerApp(app).then(() => {
            return this.redisTimeSeries.incrementBy(new Sample('connections', 1), [
                new Label('app_key', appKey),
                new Label('metric', 'connections'),
            ]);
        });
    }

    /**
     * Mark in the stats a socket disconnection.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @param  {string|null}  reason
     * @return {Promise<number>}
     */
    markDisconnection(app: App, reason?: string): Promise<number> {
        if (!this.canRegisterStats(app)) {
            return new Promise(resolve => resolve(0));
        }

        let appKey = app instanceof App ? app.key : app;

        return this.registerApp(app).then(() => {
            return this.redisTimeSeries.decrementBy(new Sample('connections', 1), [
                new Label('app_key', appKey),
                new Label('metric', 'connections'),
            ]);
        });
    }

    /**
     * Mark in the stats a new API message.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    markApiMessage(app: App): Promise<number> {
        if (!this.canRegisterStats(app)) {
            return new Promise(resolve => resolve(0));
        }

        let appKey = app instanceof App ? app.key : app;

        return this.registerApp(app).then(() => {
            return this.redisTimeSeries.add(new Sample('api_messages', 1), [
                new Label('app_key', appKey),
                new Label('metric', 'api_messages'),
            ]);
        });
    }

    /**
     * Mark in the stats a whisper message.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    markWsMessage(app: App): Promise<number> {
        if (!this.canRegisterStats(app)) {
            return new Promise(resolve => resolve(0));
        }

        let appKey = app instanceof App ? app.key : app;

        return this.registerApp(app).then(() => {
            return this.redisTimeSeries.add(new Sample('ws_messages', 1), [
                new Label('app_key', appKey),
                new Label('metric', 'ws_messages'),
            ]);
        });
    }

    /**
     * Get the compiled stats for a given app.
     *
     * @param  {App|string|number}  app
     * @return {Promise<any>}
     */
    getStats(app: App|string|number): Promise<any> {
        return new Promise(resolve => resolve({
            connections: { points: [] },
            api_messages: { points: [] },
            ws_messages: { points: [] },
        }));
    }

    /**
     * Take a snapshot of the current stats
     * for a given time.
     *
     * @param  {App|string|number}  app
     * @param  {number|null}  time
     * @return {Promise<any>}
     */
    takeSnapshot(app: App|string|number, time?: number): Promise<any> {
        return new Promise(resolve => resolve({}));
    }

    /**
     * Get the list of stats snapshots
     * for a given interval.
     * Defaults to the last 7 days.
     *
     * @param  {App|string|number}  app
     * @param  {number|null}  start
     * @param  {number|null}  end
     * @return {Promise<any>}
     */
    getSnapshots(app: App|string|number, start?: number, end?: number): Promise<any> {
        start = start ? start : dayjs().subtract(7, 'day').unix(),
        end = end ? end : dayjs().unix();

        let appKey = app instanceof App ? app.key : app;
        let filter = new FilterBuilder('app_key', appKey);
        let timestampRange = new TimestampRange(start * 1000, end * 1000);
        let sumAgg = new Aggregation(AggregationType.SUM, this.options.stats.snapshots.interval * 1000);
        let averageAgg = new Aggregation(AggregationType.AVG, this.options.stats.snapshots.interval * 1000);
        let maxAgg = new Aggregation(AggregationType.MAX, this.options.stats.snapshots.interval * 1000);

        return Promise.all([
            this.redisTimeSeries.multiRange(timestampRange, filter, undefined, sumAgg, false),
            this.redisTimeSeries.multiRange(timestampRange, filter, undefined, averageAgg, false),
            this.redisTimeSeries.multiRange(timestampRange, filter, undefined, maxAgg, false),
        ]).then(result => {
            let [sums, averages, maximums] = result;
            let stats = {};

            sums.forEach((label, labelIndex) => {
                if (label.key === appKey) {
                    return true;
                }

                let calculateBodyForPoint = (label, labelIndex, point, pointIndex) => {
                    if (label.key === 'connections') {
                        return {
                            max: maximums[labelIndex].data[pointIndex].value >= 0
                                ? parseInt(maximums[labelIndex].data[pointIndex].value)
                                : 0,
                            avg: averages[labelIndex].data[pointIndex].value >= 0
                                ? parseInt(averages[labelIndex].data[pointIndex].value)
                                : 0,
                            time: point.timestamp / 1000,
                        };
                    } else if (['api_messages', 'ws_messages'].includes(label.key)) {
                        return {
                            value: point.value > 0 ? parseInt(point.value) : 0,
                            time: point.timestamp / 1000,
                        };
                    }
                }

                stats[label.key] = {
                    points: label.data.map((point, pointIndex) => {
                        return calculateBodyForPoint(label, labelIndex, point, pointIndex);
                    }),
                };
            });

            return stats;
        });
    }

    /**
     * Delete points that are outside of the desired range
     * of keeping the history of.
     *
     * @param  {App|string|number}  app
     * @param  {number|null}  time
     * @return {Promise<boolean>}
     */
    deleteStalePoints(app: App|string|number, time?: number): Promise<boolean> {
        return new Promise(resolve => resolve(true));
    }

    /**
     * Register the app to know we have metrics for it.
     *
     * @param  {App|string|number}  app
     * @return {Promise<boolean>}
     */
    registerApp(app: App|string|number): Promise<boolean> {
        let appKey = app instanceof App ? app.key : app;

        return this.redis.exists(appKey).then(exists => {
            if (!exists) {
                return this.redisTimeSeries.create(
                    appKey,
                    [new Label('app_key', appKey)],
                    this.options.stats.retention.period * 1000,
                    4000,
                    'SUM',
                    false
                );
            } else {
                return true;
            }
        });
    }

    /**
     * Get the list of registered apps into stats.
     *
     * @return {Promise<string[]>}
     */
    getRegisteredApps(): Promise<string[]> {
        return new Promise(resolve => resolve([]));
    }

    /**
     * Check if the given app can register stats.
     *
     * @param  {App}  app
     * @return {boolean}
     */
    protected canRegisterStats(app: App): boolean {
        return this.options.stats.enabled && !!app.enableStats;
    }
}
