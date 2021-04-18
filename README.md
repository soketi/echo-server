Echo Server
===========

![CI](https://github.com/soketi/echo-server/workflows/CI/badge.svg?branch=master)
[![codecov](https://codecov.io/gh/soketi/echo-server/branch/master/graph/badge.svg)](https://codecov.io/gh/soketi/echo-server/branch/master)
[![Latest Stable Version](https://img.shields.io/github/v/release/soketi/echo-server)](https://www.npmjs.com/package/@soketi/echo-server)
[![Total Downloads](https://img.shields.io/npm/dt/@soketi/echo-server)](https://www.npmjs.com/package/@soketi/echo-server)
[![License](https://img.shields.io/npm/l/@soketi/echo-server)](https://www.npmjs.com/package/@soketi/echo-server)


Echo Server is a Docker-ready, multi-scalable Node.js application used to host your own Socket.IO server for Laravel Broadcasting.
It is built on top of Socket.IO and has a Pusher-compatible API server beneath, that makes your implementation in Laravel a breeze.

This is a fork of the original [Laravel Echo Server package](https://github.com/tlaverdure/laravel-echo-server) that was heavily modified.

- [Echo Server](#echo-server)
  - [🤝 Supporting](#-supporting)
  - [Current Milestones](#current-milestones)
  - [System Requirements](#system-requirements)
  - [🚀 Installation](#-installation)
  - [🙌 Usage](#-usage)
  - [📀 Environment Variables](#-environment-variables)
  - [📡 Pusher Compatibility](#-pusher-compatibility)
  - [📡 Frontend (Client) Configuration](#-frontend-client-configuration)
  - [👓 App Management](#-app-management)
  - [↔ Horizontal Scaling](#-horizontal-scaling)
  - [📈 Per-application Statistics](#-per-application-statistics)
  - [🚢 Deploying with PM2](#-deploying-with-pm2)
  - [🐳 Docker Images](#-docker-images)
  - [🤝 Contributing](#-contributing)
  - [🔒  Security](#--security)
  - [🎉 Credits](#-credits)
## 🤝 Supporting

Renoki Co. and Soketi on GitHub aims on bringing a lot of open source projects and helpful projects to the world. Developing and maintaining projects everyday is a harsh work and tho, we love it.

If you are using your application in your day-to-day job, on presentation demos, hobby projects or even school projects, spread some kind words about our work or sponsor our work. Kind words will touch our chakras and vibe, while the sponsorships will keep the open source projects alive.

[![ko-fi](https://www.ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/R6R42U8CL)

## Current Milestones

- MySQL Apps Manager
- InfluxDB Stats Manager

## System Requirements

The following are required to function properly:

- Node 10.0+
- Redis 6+ (optional)

Additional information on broadcasting with Laravel can be found in the official [Broadcasting docs](https://laravel.com/docs/master/broadcasting)

## 🚀 Installation

You can install the package via npm:

```bash
npm install -g @soketi/echo-server
```

## 🙌 Usage

You can run Echo Server directly from the CLI:

```bash
$ echo-server start
```

## 📀 Environment Variables

Since there is no configuration file, you may declare the parameters using environment variables directly passed in the CLI, either as key-value attributes in an `.env` file at the root of the project:

```bash
$ DEBUG=1 echo-server start
```

When using .env, you shall prefix them with `ECHO_SERVER_` to avoid conflicts:

```bash
# Within your .env file
ECHO_SERVER_DEBUG=1
```

Check the [environment variables documentation file](docs/ENV.md) on how you can configure the server according to your use case.

## 📡 Pusher Compatibility

This server has HTTP REST API compatibility with the Pusher clients. This means that you can use the `pusher` broadcasting driver pointing to the server and it will work seamlessly.

Consider the following example on setting a broadcasting driver to connect to Echo Server:

```php
'socketio' => [
    'driver' => 'pusher',
    'key' => env('SOCKETIO_APP_KEY'),
    'secret' => env('SOCKETIO_APP_SECRET'),
    'app_id' => env('SOCKETIO_APP_ID'),
    'options' => [
        'cluster' => env('SOCKETIO_APP_CLUSTER'),
        'encrypted' => true,
        'host' => env('SOCKETIO_HOST', '127.0.0.1'),
        'port' => env('SOCKETIO_PORT', 6001),
        'scheme' => 'http',
        'curl_options' => [
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_SSL_VERIFYPEER => 0,
        ],
    ],
],
```

This is your .env file:

```env
BROADCAST_DRIVER=socketio

SOCKETIO_HOST=127.0.0.1
SOCKETIO_PORT=6001
SOCKETIO_APP_ID=echo-app
SOCKETIO_APP_KEY=echo-app-key
SOCKETIO_APP_SECRET=echo-app-secret

# These are the default values to connect to. It's recommended to specify the server an `APPS_LIST`
# or override these values using `APP_DEFAULT_*` keys.
# For production workloads, it's a MUST to change the default values.

ECHO_SERVER_APP_DEFAULT_ID=echo-app
ECHO_SERVER_DEFAULT_KEY=echo-app-key
ECHO_SERVER_DEFAULT_SECRET=echo-app-secret
```

**The given configuration is an example and should not be used on production as-is. Consider checking [App Management](#app-management) section to learn how to create your own apps.**

## 📡 Frontend (Client) Configuration

Soketi.js is a hard fork of [laravel/echo](https://github.com/laravel/echo), meaning that you can use it as a normal Echo client, being fully compatible with all the docs [in the Broadcasting docs](https://laravel.com/docs/8.x/broadcasting).

```bash
$ npm install --save-dev @soketi/soketi-js
```

The Socket.IO client can be easily namespaced by using the `SOCKETIO_APP_KEY` value, so that it can listen to the `echo-app-key` namespace:

```js
import Soketi from '@soketi/soketi-js';

window.io = require('socket.io-client');

window.Soketi = new Soketi({
    host: window.location.hostname,
    key: 'echo-app-key', // should be replaced with the App Key
    authHost: 'http://127.0.0.1',
    authEndpoint: '/broadcasting/auth',
});

// for example
Soketi.channel('twitter').listen('.tweet', e => {
    console.log(e);
});
```

## 👓 App Management

Apps are used to allow access to clients, as well as to be able to securely publish events to your users by using signatures generated by app secret.

Check [documentation on how to implement different app management drivers](docs/APP_MANAGERS.md) for your app.

## ↔ Horizontal Scaling

To be able to scale it horizontally, you might want to use Redis as the replication driver, that will enable the Redis Adapter for Socket.IO and nodes can be connected to same Redis instance via Pub/Sub.

```bash
$ REPLICATION_DRIVER=redis echo-server start
```

## 📈 Per-application Statistics

Statistics are available for each registered app, if opted-in. They are disabled by default, and [you can turn them on for each app](docs/STATISTICS.md).

## 🚢 Deploying with PM2

This server is PM2-ready and [can scale to a lot of processes](docs/PM2.md).

## 🐳 Docker Images

Automatically, after each release, a Docker tag is created with an image that holds the app code. [Read about versions & usage on DockerHub](https://hub.docker.com/r/soketi/echo-server).

### ⚓ Deploy with Helm

Echo Server can also be deployed as Helm v3 chart using [charts/echo-server](https://github.com/soketi/charts/tree/master/charts/echo-server). You will find complete installation steps to configure the app on any Kubernetes cluster.

## 🤝 Contributing

Please see [CONTRIBUTING](CONTRIBUTING.md) for details.

## 🔒  Security

If you discover any security related issues, please email alex@renoki.org instead of using the issue tracker.

## 🎉 Credits

- [Thiery Laverdure](https://github.com/tlaverdure)
- [Alex Renoki](https://github.com/rennokki)
- [All Contributors](../../contributors)
