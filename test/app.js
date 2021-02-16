const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
import ClusterCache from '../src/ClusterCache';

let cache = ClusterCache.init({storage: process.env.npm_lifecycle_event || "all"});

app.get("/set", (req, res) => {
    cache.set(req.query.key, req.query.value, req.query.ttl, () => {
        res.send({status: true});
    });
});

app.get("/get", (req, res) => {
    cache.get(req.query.key, (data) => {
        res.send({key: req.query.key, value: data});
    });
    //res.send({key: req.query.key, value: undefined});
});

server.listen(8080, () => {
    //console.log(`Server started`, process.env.npm_lifecycle_event);
});