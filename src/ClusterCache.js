const pm2 = require("pm2");
const crypto = require("crypto");
import {dr, pr} from './repositories';
import {STORAGE_CLUSTER, TOPIC_GET, TOPIC_SET, TOPIC_DELETE, TOPIC_KEYS} from "./const";
var io = require('@pm2/io');

var ClusterCache = {

        options: {
            storage: STORAGE_CLUSTER,
            defaultTtl: 1000
        },
        hit: io.meter({
            name: 'Cluster Cache hit Rate',
            samples: 1,
            timeframe: 1,
            unit: 'hit/s'
        }),
        miss: io.meter({
            name: 'Cluster Cache miss Rate',
            samples: 1,
            timeframe: 1,
            unit: 'miss/s'
        }),

        init: function (options) {
            process.setMaxListeners(0);
            Object.assign(ClusterCache.options, options);
            process.on('message', function (packet) {
                let data = packet.data;

                if (packet.topic === TOPIC_SET) {
                    dr.set(data.k, data);
                }

                if (packet.topic === TOPIC_DELETE) {
                    dr.delete(data.k);
                }

                if (packet.topic === TOPIC_KEYS) {
                    pm2.sendDataToProcessId(data.respond, {
                        data: dr.keys(),
                        topic: data.cb
                    }, function () {
                    });
                }

                if (packet.topic === TOPIC_GET) {
                    pm2.sendDataToProcessId(data.respond, {
                        data: dr.get(data.k),
                        topic: data.cb
                    }, function (e) {

                    });
                }

            });
            return this;
        },

        keysOnProc: function (proc) {
            return new Promise((ok, fail) => {
                if (parseInt(process.env.pm_id) === parseInt(proc)) {
                    return ok(dr.keys());
                }
                let topic = ClusterCache.generateRespondTopic();
                pm2.sendDataToProcessId(proc, {
                    data: {
                        respond: process.env.pm_id,
                        cb: topic
                    },
                    topic: TOPIC_KEYS
                }, function () {
                    process.on('message', function (packet) {
                        if (packet.topic === topic) {
                            return ok(packet.data);
                        }
                    });
                });
            });
        },

        generateRespondTopic: function () {
            return 'clusterCache#' + crypto.randomBytes(16).toString("hex");
        },

        keys: function () {
            return new Promise(function (ok, fail) {
                pm2.connect(function () {
                    pm2.list(async function (err, processes) {
                        let map = {};
                        for (var p in processes) {
                            if (processes[p].name === process.env.name) {
                                let proc = processes[p].pm_id;
                                map[proc] = await ClusterCache.keysOnProc(proc);
                            }
                        }
                        return ok(map);
                    });
                });
            });
        },

        delete: function (key) {
            return new Promise((ok, fail) => {
                pr.getWriteProcess(key, ClusterCache.options.storage).then(processes => {
                    processes.forEach((p) => {
                        ClusterCache._deleteFromProc(key, p);
                    });
                    return ok(processes);
                });
            });
        },

        _deleteFromProc: function (key, proc) {
            if (parseInt(proc) === parseInt(process.env.pm_id)) {
                dr.delete(key);
            } else {
                pm2.sendDataToProcessId(proc, {
                    data: {
                        k: key
                    },
                    topic: TOPIC_DELETE
                }, function (e) {

                });
            }
        },

        get: function (key, defaultValue) {
            return new Promise((ok, fail) => {
                pr.getReadProcess(key, ClusterCache.options.storage).then(async processes => {
                    let randProc = processes[~~(Math.random() * processes.length)];
                    ClusterCache._getFromProc(key, randProc).then(value => {
                        if (value === undefined) {
                            ClusterCache.miss.mark();
                            return ok({
                                data: defaultValue,
                                metadata: {
                                    storedOn: [],
                                    readFrom: parseInt(randProc),
                                    servedBy: process.env.pm_id
                                }
                            })
                        } else {
                            ClusterCache.hit.mark();
                            return ok({
                                data: value,
                                metadata: {
                                    storedOn: processes,
                                    readFrom: parseInt(randProc),
                                    servedBy: process.env.pm_id
                                }
                            });
                        }
                    }).catch(e => {
                        ClusterCache.miss.mark();
                        return ok({
                            data: defaultValue,
                            metadata: {
                                storedOn: [],
                                readFrom: parseInt(randProc),
                                servedBy: process.env.pm_id
                            }
                        });
                    });
                });
            });

        },

        _getFromProc: function (key, proc) {
            return new Promise((ok, fail) => {

                if (parseInt(process.env.pm_id) === parseInt(proc)) {
                    let data = dr.get(key);
                    return (data !== '') ? ok(data) : fail();
                }
                let topic = ClusterCache.generateRespondTopic();

                pm2.sendDataToProcessId(proc, {
                    data: {
                        respond: process.env.pm_id,
                        cb: topic,
                        k: key
                    },
                    topic: TOPIC_GET
                }, function (err) {
                    if(err) fail();
                    process.on('message', function (packet) {
                        if (packet.topic === topic) {
                            return (packet.data !== '') ? ok(packet.data) : fail();
                        }
                    });
                });
            });
        },

        set: function (key, value, ttl) {
            return new Promise((ok, fail) => {
                if (ttl === undefined) {
                    ttl = ClusterCache.options.defaultTtl;
                }
                pr.getWriteProcess(key, ClusterCache.options.storage).then(processes => {
                    processes.forEach(async (p) => {
                        await ClusterCache._setToProc(key, value, ttl, p);
                    });
                    return ok({
                        storedOn: processes,
                        readFrom: -1,
                        servedBy: process.env.pm_id
                    });
                });
            });

        },

        _setToProc: function (key, value, ttl, proc) {
            return new Promise((ok, fail) => {
                if (parseInt(proc) === parseInt(process.env.pm_id)) {
                    let data = {
                        k: key,
                        v: value,
                        t: new Date().getTime() + parseInt(ttl)
                    };
                    dr.set(key, data);
                    return ok();
                } else {
                    pm2.sendDataToProcessId(proc, {
                        data: {
                            k: key,
                            v: value,
                            t: new Date().getTime() + parseInt(ttl)
                        },
                        topic: TOPIC_SET
                    }, function (e) {
                        return ok();
                    });
                }
            });
        }
    }
;

module.exports = {
    get: ClusterCache.get,
    set: ClusterCache.set,
    delete: ClusterCache.delete,
    keys: ClusterCache.keys,
    init: ClusterCache.init
};