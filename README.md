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
  - [⚙ Configuration](#-configuration)
    - [📀 Environment Variables](#-environment-variables)
    - [📡 Pusher Compatibility](#-pusher-compatibility)
      - [🔐 Encrypted Private Channels](#-encrypted-private-channels)
    - [📡 Frontend (Client) Configuration](#-frontend-client-configuration)
    - [👓 App Management](#-app-management)
    - [↔ Horizontal Scaling](#-horizontal-scaling)
    - [📈 Per-application Statistics](#-per-application-statistics)
  - [📦 Deploying](#-deploying)
    - [🚢 Deploying with PM2](#-deploying-with-pm2)
    - [🐳 Deploying with Docker](#-deploying-with-docker)
    - [⚓ Deploy with Helm](#-deploy-with-helm)
    - [🌍 Running at scale](#-running-at-scale)
  - [🤝 Contributing](#-contributing)
  - [🔒  Security](#--security)
  - [🎉 Credits](#-credits)
## 🤝 Supporting

Renoki Co. and Soketi on GitHub aims on bringing a lot of open source projects and helpful projects to the world. Developing and maintaining projects everyday is a harsh work and tho, we love it.

If you are using your application in your day-to-day job, on presentation demos, hobby projects or even school projects, spread some kind words about our work or sponsor our work. Kind words will touch our chakras and vibe, while the sponsorships will keep the open source projects alive.

[![ko-fi](https://www.ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/R6R42U8CL)

## Current Milestones

- MySQL Apps Manager

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

## ⚙ Configuration

### 📀 Environment Variables

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

### 📡 Pusher Compatibility

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

MIX_SOCKETIO_APP_KEY="${SOCKETIO_APP_KEY}"

# These are the default values to connect to. It's recommended to specify the server an `APPS_LIST`
# or override these values using `APP_DEFAULT_*` keys.
# For production workloads, it's a MUST to change the default values.

ECHO_SERVER_APP_DEFAULT_ID=echo-app
ECHO_SERVER_DEFAULT_KEY=echo-app-key
ECHO_SERVER_DEFAULT_SECRET=echo-app-secret
```

**The given configuration is an example and should not be used on production as-is. Consider checking [App Management](#app-management) section to learn how to create your own apps.**

#### 🔐 Encrypted Private Channels

Starting with 5.4.0, Echo Server supports Encrypted Private Channels. This feature needs extra configuration from your side to make them work, according to the [Pusher protocol](https://pusher.com/docs/channels/using_channels/encrypted-channels).

The minimum required soketi-js package is [@soketi/soketi-js@^1.4.2](https://github.com/soketi/soketi-js/releases/tag/1.4.2). You will be using it instead of Laravel Echo. To find more about the frontend configuration, read [Frontend (Client) Configuration](#-frontend-client-configuration).

You will need to configure your frontend client and your event-sending backend client with a master key that will be generated using the OpenSSL CLI:

```bash
$ openssl rand -base64 32
```

The generated key by the command will be then used **only in your client** configurations. These has nothing to do with the server configuration, as finding the key at the server-side will not match with the protocol specifications and will reside a potential security breach.

```php
'socketio' => [
    'driver' => 'pusher',
    ...
    'options' => [
        ...
        'encryption_master_key_base64' => 'vwTqW/UBENYBOySubUo8fldlMFvCzOY8BFO5xAgnOus=',
    ],
],
```

```js
window.Soketi = new Soketi({
    ...
    encryptionMasterKeyBase64: 'vwTqW/UBENYBOySubUo8fldlMFvCzOY8BFO5xAgnOus=',
});
```

You then are free to use the encrypted private channels:

```js
Soketi.encryptedPrivate('top-secret').listen('.new-documents', e => {
    //
});
```

### 📡 Frontend (Client) Configuration

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
    key: process.env.MIX_SOCKETIO_APP_KEY, // should be replaced with the App Key
    authHost: 'http://127.0.0.1',
    authEndpoint: '/broadcasting/auth',
});

// for example
Soketi.channel('twitter').listen('.tweet', e => {
    console.log(e);
});
```

### 👓 App Management

Apps are used to allow access to clients, as well as to be able to securely publish events to your users by using signatures generated by app secret.

Check [documentation on how to implement different app management drivers](docs/APP_MANAGERS.md) for your app.

### ↔ Horizontal Scaling

To be able to scale it horizontally, you might want to use Redis as the replication driver, that will enable the Redis Adapter for Socket.IO and nodes can be connected to same Redis instance via Pub/Sub.

```bash
$ REPLICATION_DRIVER=redis echo-server start
```

### 📈 Per-application Statistics

Statistics are available for each registered app, if opted-in. They are disabled by default, and [you can turn them on for each app](docs/STATISTICS.md).

## 📦 Deploying

### 🚢 Deploying with PM2

This server is PM2-ready and [can scale to a lot of processes](docs/PM2.md).

### 🐳 Deploying with Docker

Automatically, after each release, a Docker tag is created with an image that holds the app code. [Read about versions & usage on DockerHub](https://hub.docker.com/r/soketi/echo-server).

### ⚓ Deploy with Helm

Echo Server can also be deployed as Helm v3 chart using [charts/echo-server](https://github.com/soketi/charts/tree/master/charts/echo-server). You will find complete installation steps to configure the app on any Kubernetes cluster.

### 🌍 Running at scale

If you run Echo Server standalone in a cluster, at scale, you might run into capacity issues: RAM usage might be near the limit and even if you decide to horizontally scale the pods, new connections might still come to pods that are near-limit and run into OOM at some point.

Running [Network Watcher](https://github.com/soketi/network-watcher) inside the same pod will solve the issues by continuously checking the current pod using the Prometheus client (**Prometheus Server is not needed!**), labeling the pods that get over a specified threshold.

## 🤝 Contributing

Please see [CONTRIBUTING](CONTRIBUTING.md) for details.

## 🔒  Security

If you discover any security related issues, please email alex@renoki.org instead of using the issue tracker.

## 🎉 Credits

- [Thiery Laverdure](https://github.com/tlaverdure)
- [Alex Renoki](https://github.com/rennokki)
- [All Contributors](../../contributors)
