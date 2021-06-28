const express = require('express');
const fs = require('fs');
const app = express();
const bodyParser = require('body-parser');
const port = 3000;

app.use(bodyParser.json({ strict: true }));

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
            enableStats: true,
            enableClientMessages: true,
            maxBackendEventsPerMinute: -1,
            maxClientEventsPerMinute: -1,
            maxReadRequestsPerMinute: -1,
            webhooks: [{
                event_type: 'client-event',
                url: 'http://127.0.0.1:3000/webhook1',
            }],
        },
    });
});

app.post('/webhook1', (req, res) => {
    fs.readFile('webhooks.json', 'utf8', (err, data) => {
        let json = [];

        if (data) {
            json = JSON.parse(data);
        }

        let content = {
            query: req.query,
            body: req.body,
            headers: req.headers,
            type: 'client-event',
        };

        json.push(content);

        fs.writeFile('webhooks.json', JSON.stringify(json), () => {
            //
        });
    });

    res.json({
        ok: true,
    });
});

app.listen(port, () => {
  console.log(`Testing API server http://localhost:${port}`);
});
