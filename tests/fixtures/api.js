const express = require('express');
const app = express();
const port = 3000;

app.get('/get-app', (req, res) => {
    if (req.query.token !== process.env.APPS_MANAGER_TOKEN) {
        res.statusCode = 401;
        return res.json({ error: 'Unauthenticated' });
    }

    if (req.query.appId && req.query.appId !== '1') {
        res.statusCode = 404;
        return res.json({ app: null });
    }

    if (req.query.appKey && req.query.appKey !== 'echo-app-key') {
        res.statusCode = 404;
        return res.json({ app: null });
    }

    res.json({
        app: {
            id: 1,
            key: 'echo-app-key',
            secret: 'echo-app-secret',
            maxConnections: 100,
            enableStats: false,
        },
    });
});

app.listen(port, () => {
  console.log(`Testing API server http://localhost:${port}`);
});
