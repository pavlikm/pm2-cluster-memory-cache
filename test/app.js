import "@babel/polyfill";
const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
import ClusterCache from '../src/ClusterCache';

let type = "self";
let cache = ClusterCache.init({storage: process.env.npm_lifecycle_event || type});

app.get("/set", (req, res) => {
    let key = req.query.key;
    let data = req.query.value;
    let ttl = req.query.ttl;
    cache.withMeta().set(key, data, ttl).then(meta => {
        res.send({key: key, value: data, metadata: meta});
    });
});

app.get("/get", (req, res) => {
    let key = req.query.key;
    let defaultValue = req.query.default || 'undefined';
    cache.withMeta().get(key, defaultValue).then(result => {
        res.send({key: key, value: result.data, metadata: result.metadata});
    });
});

app.get("/inc", (req, res) => {
   let key = req.query.key;
   cache.inc(key).then(result => {
       res.send({key: key, value: result});
   })
});

app.get("/dec", (req, res) => {
    let key = req.query.key;
    cache.dec(key).then(result => {
        res.send({key: key, value: result});
    })
});

app.get("/write", (req, res) => {
    let key = req.query.key;
    let data = req.query.value;
    let ttl = req.query.ttl;
    cache.set(key, data, ttl).then(result => {
        res.send({key: key, value: data, result: result});
    });
});

app.get("/read", (req, res) => {
    let key = req.query.key;
    let defaultValue = req.query.default || 'undefined';
    cache.get(key, defaultValue).then(result => {
        res.send({key: key, value: result});
    });
});

app.get("/delete", (req, res) => {
    cache.delete(req.query.key).then(data => {
        res.send(data);
    });
});

app.get("/flush", (req, res) => {
    cache.flush().then(() => {
        res.send("ok");
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