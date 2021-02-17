import "@babel/polyfill";
const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
import ClusterCache from '../src/ClusterCache';

let cache = ClusterCache.init({storage: process.env.npm_lifecycle_event || "cluster"});

app.get("/set", (req, res) => {
    let key = req.query.key;
    let data = req.query.data;
    let ttl = req.query.ttl;
    cache.set(key, data, ttl).then(metadata => {
        res.send({key: key, value: data, metadata: metadata});
    });
});

app.get("/get", (req, res) => {
    cache.get(req.query.key, 'defaultValue').then(data => {
        res.send({key: req.query.key, value: data});
    });
});

app.get("/info", (req, res) => {
    cache.keys().then(data => {
        res.send(data);
    });
});


server.listen(8080, () => {
    //console.log(`Server started`, process.env.npm_lifecycle_event);
});