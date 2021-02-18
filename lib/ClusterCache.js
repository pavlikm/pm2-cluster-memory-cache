"use strict";

var _repositories = require("./repositories");

var _const = require("./const");

var pm2 = require("pm2");
var crypto = require("crypto");

var io = require('@pm2/io');

var ClusterCache = {

    options: {
        storage: _const.STORAGE_CLUSTER,
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

    init: function init(options) {
        process.setMaxListeners(0);
        Object.assign(ClusterCache.options, options);
        process.on('message', function (packet) {
            var data = packet.data;

            if (packet.topic === _const.TOPIC_SET) {
                _repositories.dr.set(data.k, data);
            }

            if (packet.topic === _const.TOPIC_DELETE) {
                _repositories.dr.delete(data.k);
            }

            if (packet.topic === _const.TOPIC_KEYS) {
                pm2.sendDataToProcessId(data.respond, {
                    data: _repositories.dr.keys(),
                    topic: data.cb
                }, function () {});
            }

            if (packet.topic === _const.TOPIC_GET) {
                pm2.sendDataToProcessId(data.respond, {
                    data: _repositories.dr.get(data.k),
                    topic: data.cb
                }, function (e) {});
            }
        });
        return this;
    },

    keysOnProc: function keysOnProc(proc) {
        return new Promise(function (ok, fail) {
            if (parseInt(process.env.pm_id) === parseInt(proc)) {
                return ok(_repositories.dr.keys());
            }
            var topic = ClusterCache.generateRespondTopic();
            pm2.sendDataToProcessId(proc, {
                data: {
                    respond: process.env.pm_id,
                    cb: topic
                },
                topic: _const.TOPIC_KEYS
            }, function () {
                process.on('message', function (packet) {
                    if (packet.topic === topic) {
                        return ok(packet.data);
                    }
                });
            });
        });
    },

    generateRespondTopic: function generateRespondTopic() {
        return 'clusterCache#' + crypto.randomBytes(16).toString("hex");
    },

    keys: function keys() {
        return new Promise(function (ok, fail) {
            pm2.connect(function () {
                pm2.list(async function (err, processes) {
                    var map = {};
                    for (var p in processes) {
                        if (processes[p].name === process.env.name) {
                            var proc = processes[p].pm_id;
                            map[proc] = await ClusterCache.keysOnProc(proc);
                        }
                    }
                    return ok(map);
                });
            });
        });
    },

    delete: function _delete(key) {
        return new Promise(function (ok, fail) {
            _repositories.pr.getWriteProcess(key, ClusterCache.options.storage).then(function (processes) {
                processes.forEach(function (p) {
                    ClusterCache._deleteFromProc(key, p);
                });
                return ok(processes);
            });
        });
    },

    _deleteFromProc: function _deleteFromProc(key, proc) {
        if (parseInt(proc) === parseInt(process.env.pm_id)) {
            _repositories.dr.delete(key);
        } else {
            pm2.sendDataToProcessId(proc, {
                data: {
                    k: key
                },
                topic: _const.TOPIC_DELETE
            }, function (e) {});
        }
    },

    get: function get(key, defaultValue) {
        return new Promise(function (ok, fail) {
            _repositories.pr.getReadProcess(key, ClusterCache.options.storage).then(async function (processes) {
                var randProc = processes[~~(Math.random() * processes.length)];
                ClusterCache._getFromProc(key, randProc).then(function (value) {
                    if (value === undefined) {
                        ClusterCache.miss.mark();
                        return ok({
                            data: defaultValue,
                            metadata: {
                                storedOn: [],
                                readFrom: parseInt(randProc),
                                servedBy: process.env.pm_id
                            }
                        });
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
                }).catch(function (e) {
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

    _getFromProc: function _getFromProc(key, proc) {
        return new Promise(function (ok, fail) {

            if (parseInt(process.env.pm_id) === parseInt(proc)) {
                var data = _repositories.dr.get(key);
                return data !== '' ? ok(data) : fail();
            }
            var topic = ClusterCache.generateRespondTopic();

            pm2.sendDataToProcessId(proc, {
                data: {
                    respond: process.env.pm_id,
                    cb: topic,
                    k: key
                },
                topic: _const.TOPIC_GET
            }, function (err) {
                if (err) fail();
                process.on('message', function (packet) {
                    if (packet.topic === topic) {
                        return packet.data !== '' ? ok(packet.data) : fail();
                    }
                });
            });
        });
    },

    set: function set(key, value, ttl) {
        return new Promise(function (ok, fail) {
            if (ttl === undefined) {
                ttl = ClusterCache.options.defaultTtl;
            }
            _repositories.pr.getWriteProcess(key, ClusterCache.options.storage).then(function (processes) {
                processes.forEach(async function (p) {
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

    _setToProc: function _setToProc(key, value, ttl, proc) {
        return new Promise(function (ok, fail) {
            if (parseInt(proc) === parseInt(process.env.pm_id)) {
                var data = {
                    k: key,
                    v: value,
                    t: new Date().getTime() + parseInt(ttl)
                };
                _repositories.dr.set(key, data);
                return ok();
            } else {
                pm2.sendDataToProcessId(proc, {
                    data: {
                        k: key,
                        v: value,
                        t: new Date().getTime() + parseInt(ttl)
                    },
                    topic: _const.TOPIC_SET
                }, function (e) {
                    return ok();
                });
            }
        });
    }
};

module.exports = {
    get: ClusterCache.get,
    set: ClusterCache.set,
    delete: ClusterCache.delete,
    keys: ClusterCache.keys,
    init: ClusterCache.init
};