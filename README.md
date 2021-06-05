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

## System Requirements

The following are required to function properly:

- Node 12.0+
- Redis 6+ (optional)

Additional information on broadcasting with Laravel can be found in the official [Broadcasting docs](https://laravel.com/docs/master/broadcasting)

## 🚀 Installation

You can install the package via npm:

```bash
npm install -g @soketi/echo-server
```

For additional ways of deployment, see [Deploying](#-deploying).

## 🙌 Usage

You can run Echo Server directly from the CLI:

```bash
$ echo-server start
```

## ⚙ Configuration

### 📀 Environment Variables

You may declare the parameters using environment variables directly passed in the CLI or at the OS level, or as key-value attributes in an `.env` file at the root of the project:

```bash
$ DEBUG=1 echo-server start
```

When using .env, you can prefix them with `ECHO_SERVER_` to avoid conflicts with other apps, but consider this optionally:

```bash
# Within your .env file
ECHO_SERVER_DEBUG=1
```

Read the extensive [environment variables documentation](docs/ENV.md) and learn how to configure the entire Echo Server application to suit your needs.

### 📡 Pusher Compatibility

This server has only HTTP REST API compatibility with any Pusher client. This means that you can use the `pusher` broadcasting driver in Laravel, and point it to the Echo Server and it will work seamlessly on broadcasting events from your backend.

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

This is how an usual .env file might look in Laravel. **It's really important to seize the access to the Echo Server by usign a firewall and/or choose a good random combination of app ID, app key and app secret so that you are secure.**

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

**The given configuration is an example and should not be used on production as-is. Consider the [App Management](#app-management) section to learn how to create your own apps or configure a local one for testing purposes.**

#### 🔐 Encrypted Private Channels

Starting with 5.4.0, Echo Server supports Encrypted Private Channels. This feature needs extra configuration from your side to make them work, according to the [Pusher protocol](https://pusher.com/docs/channels/using_channels/encrypted-channels).

The minimum required soketi-js package is [@soketi/soketi-js@^1.4.2](https://github.com/soketi/soketi-js/releases/tag/1.4.2). You will be using it instead of Laravel Echo. To get started with the frontend configuration, see [Frontend (Client) Configuration](#-frontend-client-configuration).

You will need to configure your frontend client and your event-sending backend client with a master key that will be generated using the OpenSSL CLI:

```bash
$ openssl rand -base64 32
```

The generated key by the command will be then used **only in your client** configurations and the backend application (in a Laravel app - in your `broadcasting.php` file). These has nothing to do with the server configuration, as finding the key at the server-side will not match with the protocol specifications and will reside a potential security breach.

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

[Soketi.js](https://github.com/soketi/soketi-js) is a hard fork of [laravel/echo](https://github.com/laravel/echo) and customized to solve the custom build that Echo Server has. You can use it as a normal Echo client for the Echo Server, while retaining most of the features that are currently presented in the [Laravel Broadcasting docs](https://laravel.com/docs/8.x/broadcasting).

Install it via the CLI:

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

Get started with the extensive [documentation on how to implement different app management drivers](docs/APP_MANAGERS.md) for your app, with examples.

### ↔ Horizontal Scaling

Echo Server is optimized to work in multi-node or multi-process environments, like Kubernetes or PM2, where horizontal scalability is one of the main core features that can be built upon.

To be able to scale it horizontally, most of the features leverage the Redis database on both node-to-node communication via Pub/Sub and storage via the key-value store that Redis has already built-in.

You can configure Echo Server to run in a horizontal-ready mode by specifying it using [an environment variable](docs/ENV.md#replication).

```bash
$ REPLICATION_DRIVER=redis echo-server start
```

### 📈 Per-application Statistics

Statistics are available for each registered app, if opted-in. They are disabled by default, and you can turn them on for each app. [Get started with built-in Echo Server statistics managers](docs/STATISTICS.md).

## 📦 Deploying

### 🚢 Deploying with PM2

PM2 is not necessarily horizontally scalable by node, but it is by process. Echo Server PM2-ready and [can scale to a lot of processes](docs/PM2.md) with ease and without running into conflicts.

### 🐳 Deploying with Docker

Automatically after each release, a Docker tag is created with the application running in Node.js, for your ease. You might want to use them to deploy or test Echo Server on Docker, Docker Swarm or Kubernetes, or any other container orchestration environment. [Get started with the versioning & Docker usage on DockerHub](https://hub.docker.com/r/soketi/echo-server).

### ⚓ Deploy with Helm

Echo Server can also be deployed as Helm v3 chart. Echo Server has an official Helm chart at [charts/echo-server](https://github.com/soketi/charts/tree/master/charts/echo-server). You will find complete installation steps to configure and run the app on any Kubernetes cluster.

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
