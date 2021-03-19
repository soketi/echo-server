import { App } from './../app';
import { PrometheusDriver } from 'prometheus-query';
import { StatsDriver } from './stats-driver';

const dayjs = require('dayjs');
const request = require('request');

export class PrometheusStats implements StatsDriver {
    /**
     * The Prometheus client.
     *
     * @type {PrometheusDriver}
     */
    protected prometheus: PrometheusDriver;

    /**
     * Initialize the Prometheus stats driver.
     *
     * @param {any} options
     */
    constructor(protected options: any) {
        let { host, port, protocol } = this.options.database.prometheus;

        this.prometheus = new PrometheusDriver({
            endpoint: `${protocol}://${host}:${port}`,
            baseURL: '/api/v1',
        });
    }

    /**
     * Mark in the stats a new connection.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    markNewConnection(app: App): Promise<number> {
        return new Promise(resolve => resolve(0));
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
        return new Promise(resolve => resolve(0));
    }

    /**
     * Mark in the stats a new API message.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    markApiMessage(app: App): Promise<number> {
        return new Promise(resolve => resolve(0));
    }

    /**
     * Mark in the stats a whisper message.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    markWsMessage(app: App): Promise<number> {
        return new Promise(resolve => resolve(0));
    }

    /**
     * Get the compiled stats for a given app.
     *
     * @param  {App|string}  app
     * @return {Promise<any>}
     */
    getStats(app: App|string): Promise<any> {
        return new Promise(resolve => resolve({}));
    }

    /**
     * Take a snapshot of the current stats
     * for a given time.
     *
     * @param  {App|string}  app
     * @param  {number|null}  time
     * @return {Promise<any>}
     */
    takeSnapshot(app: App|string, time?: number): Promise<any> {
        return new Promise(resolve => resolve({}));
    }

    /**
     * Get the list of stats snapshots
     * for a given interval. Defaults to
     * the last 7 days.
     *
     * @param  {App|string}  app
     * @param  {number|null}  start
     * @param  {number|null}  end
     * @return {Promise<any>}
     */
    getSnapshots(app: App|string, start?: number, end?: number): Promise<any> {
        start = start ? start : dayjs().subtract(7, 'day').unix();
        end = end ? end : dayjs().unix();

        let appKey = app instanceof App ? app.key : app;
        let step = this.calculateStepFor(start, end);
        let stringStep = this.calculateStringStepFor(start, end);

        start = start * 1000;
        end = end * 1000;

        return Promise.all([
            this.prometheus.rangeQuery(`floor(sum(increase(socket_io_http_events_received_total{namespace="/${appKey}"}[${stringStep}])))`, start, end, step),
            this.prometheus.rangeQuery(`floor(sum(increase(socket_io_server_to_client_events_sent_total{namespace="/${appKey}"}[${stringStep}])))`, start, end, step),
            this.prometheus.rangeQuery(`floor(sum(socket_io_connected{namespace="/${appKey}"}))`, start, end, step),
            this.prometheus.rangeQuery(`floor(max(socket_io_connected{namespace="/${appKey}"}))`, start, end, step),
        ]).then((results) => {
            let [api_messages, ws_messages, connections, peak_connections] = results;

            return {
                api_messages: api_messages.result[0] ? api_messages.result[0].values : [],
                ws_messages: ws_messages.result[0] ? ws_messages.result[0].values : [],
                connections: connections.result[0] ? connections.result[0].values : [],
                peak_connections: peak_connections.result[0] ? peak_connections.result[0].values : [],
            };
        });
    }

    /**
     * Delete points that are outside of the desired range
     * of keeping the history of.
     *
     * @param  {App|string}  app
     * @param  {number|null}  time
     * @return {Promise<boolean>}
     */
    deleteStalePoints(app: App|string, time?: number): Promise<boolean> {
        return new Promise(resolve => resolve(true));
    }

    /**
     * Register the app to know we have metrics for it.
     *
     * @param  {App|string}  app
     * @return {Promise<boolean>}
     */
    registerApp(app: App|string): Promise<boolean> {
        return new Promise(resolve => resolve(true));
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
     * Calculate the appropriate Prometheus interval,
     * in seconds, for given start and end dates.
     *
     * @param  {number}  start
     * @param  {number}  end
     * @return {number}
     */
    protected calculateStepFor(start: number, end: number): number {
        let startDate = dayjs(start);
        let endDate = dayjs(end);

        if (startDate.diff(endDate, 'month') > 12) {
            return 60 * 60 * 24 * 30 * 12; // 1y
        } else if (startDate.diff(endDate, 'month') > 1) {
            return 60 * 60 * 24 * 30; // 1M
        } else if (startDate.diff(endDate, 'days') > 3) {
            return 60 * 60 * 24; // 1d
        } else {
            return 60 * 60; // 1h
        }
    }

    /**
     * Calculate the appropriate Prometheus interval,
     * in seconds, for given start and end dates.
     *
     * @param  {number}  start
     * @param  {number}  end
     * @return {string}
     */
     protected calculateStringStepFor(start: number, end: number): string {
        let startDate = dayjs(start);
        let endDate = dayjs(end);

        if (startDate.diff(endDate, 'month') > 12) {
            return '1y';
        } else if (startDate.diff(endDate, 'month') > 1) {
            return '1M';
        } else if (startDate.diff(endDate, 'days') > 3) {
            return '1d';
        } else {
            return '1h';
        }
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
