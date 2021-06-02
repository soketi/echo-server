const express = require('express');
const app = express();
const port = 3000;

app.get('/echo-server/app', (req, res) => {
    if (req.query.token !== process.env.APPS_MANAGER_TOKEN) {
        res.statusCode = 401;
        return res.json({ error: 'Unauthenticated' });
    }

    if (!req.query.appId && !req.query.appKey) {
        res.statusCode = 404;
        return res.json({ app: null });
    }

    if (req.query.appId && req.query.appId !== 'echo-app') {
        res.statusCode = 404;
        return res.json({ app: null });
    }

    if (req.query.appKey && req.query.appKey !== 'echo-app-key') {
        res.statusCode = 404;
        return res.json({ app: null });
    }

    res.json({
        app: {
            id: 'echo-app',
            key: 'echo-app-key',
            secret: 'echo-app-secret',
            maxConnections: 100,
            enableStats: false,
            enableClientMessages: true,
            maxBackendEventsPerMinute: -1,
            maxClientEventsPerMinute: -1,
            maxReadRequestsPerMinute: -1,
        },
    });
});

app.listen(port, () => {
  console.log(`Testing API server http://localhost:${port}`);
});
