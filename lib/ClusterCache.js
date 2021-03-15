"use strict";

var _metadata = require("./metadata");

var _metadata2 = _interopRequireDefault(_metadata);

var _repositories = require("./repositories");

var _pm2Monitor = require("./pm2Monitor");

var _pm2Monitor2 = _interopRequireDefault(_pm2Monitor);

var _const = require("./const");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var pm2 = require("pm2");
var crypto = require("crypto");


var ClusterCache = {

    initialized: false,
    options: {
        storage: _const.STORAGE_CLUSTER,
        defaultTtl: 10000,
        logger: console
    },

    init: function init(options) {
        if (ClusterCache.initialized) {
            if (options.storage && ClusterCache.options.storage !== options.storage) {
                ClusterCache.options.logger.warn("pm2-cluster-cache already initialized - storage changed to previous init value - '" + ClusterCache.options.storage + "'");
            }
            if (options.defaultTtl && ClusterCache.options.defaultTtl !== options.defaultTtl) {
                ClusterCache.options.logger.warn("pm2-cluster-cache already initialized - defaultTtl changed to previous init value - '" + ClusterCache.options.defaultTtl + "'");
            }
            return this;
        }
        if (options.defaultTtl && (typeof options.defaultTtl !== "number" || options.defaultTtl <= 0)) {
            ClusterCache.options.logger.warn("invalid value defaultTtl, will use default value: " + ClusterCache.options.defaultTtl);
            delete options.defaultTtl;
        }
        if (options.storage && [_const.STORAGE_CLUSTER, _const.STORAGE_SELF, _const.STORAGE_ALL, _const.STORAGE_MASTER].includes(options.storage) === false) {
            ClusterCache.options.logger.warn("invalid value storage, will use default value: " + ClusterCache.options.storage);
            delete options.storage;
        }
        Object.assign(ClusterCache.options, options);
        if (process.env.pm_id === undefined) {
            process.env.pm_id = -1;
            ClusterCache.options.storage = _const.STORAGE_SELF;
            ClusterCache.options.logger.warn("not running on pm2 - pm2-cluster-cache storage forced to '" + _const.STORAGE_SELF + "'");
        } else {
            _repositories.pr.init();
            process.setMaxListeners(0);
        }

        process.on('message', function (packet) {
            var data = packet.data;

            if (packet.topic === _const.TOPIC_SET) {
                _repositories.dr.set(data.k, data);
            }

            if (packet.topic === _const.TOPIC_DELETE) {
                _repositories.dr.delete(data.k);
            }

            if (packet.topic === _const.TOPIC_FLUSH) {
                _repositories.dr.flush();
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

            if (packet.topic === _const.TOPIC_INC) {
                var newValue = _repositories.dr.inc(data.k, data.v);
                pm2.sendDataToProcessId(data.respond, {
                    data: newValue,
                    topic: data.cb
                }, function (e) {});
            }
        });
        ClusterCache.initialized = true;
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
            }, function (e) {
                if (e) return fail();
                process.prependOnceListener('message', function (packet) {
                    if (packet.topic === topic) {
                        return ok(packet.data);
                    }
                });
            });
        });
    },

    generateRespondTopic: function generateRespondTopic() {
        return 'clusterCache' + crypto.randomBytes(16).toString("hex");
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

    flush: function flush() {
        return new Promise(async function (ok, fail) {
            var processes = await _repositories.pr.getAll();
            processes.forEach(function (p) {

                pm2.sendDataToProcessId(p, {
                    data: {},
                    topic: _const.TOPIC_FLUSH
                }, function (e) {
                    if (e) return fail();
                });
            });
            return ok();
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

    inc: async function inc(key) {
        try {
            var val = await ClusterCache.read(key, null);
            if (val === null) {
                await ClusterCache.set(key, 0);
                return 0;
            }
            val = await ClusterCache.read(key, null);
            await ClusterCache.incBy(key, 1);
            return parseInt(val) + 1;
        } catch (e) {}
    },

    dec: async function dec(key) {
        try {
            var val = await ClusterCache.read(key, null);
            if (val === null) {
                ClusterCache.write(key, 0);
                return 0;
            } else {
                await ClusterCache.incBy(key, -1);
                return val - 1;
            }
        } catch (e) {}
    },

    read: async function read(key, defaultValue) {
        try {
            var value = await ClusterCache.get(key, defaultValue);
            return value.data;
        } catch (e) {
            return defaultValue;
        }
    },

    get: function get(key, defaultValue) {
        return new Promise(function (ok, fail) {
            if (typeof key !== "string") {
                return fail('non string value passed to key');
            }
            _repositories.pr.getReadProcess(key, ClusterCache.options.storage).then(async function (processes) {
                var randProc = processes[~~(Math.random() * processes.length)];
                ClusterCache._getFromProc(key, randProc).then(function (value) {
                    if (value === undefined) {
                        _pm2Monitor2.default.miss();
                        return ok({
                            data: defaultValue,
                            metadata: (0, _metadata2.default)([], randProc)
                        });
                    } else {
                        _pm2Monitor2.default.hit();
                        return ok({
                            data: value,
                            metadata: (0, _metadata2.default)(processes, randProc)
                        });
                    }
                }).catch(function (e) {
                    _pm2Monitor2.default.miss();
                    return ok({
                        data: defaultValue,
                        metadata: (0, _metadata2.default)([], randProc)
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
                process.prependOnceListener('message', function (packet) {
                    if (packet.topic === topic) {
                        return packet.data !== '' ? ok(packet.data) : fail();
                    }
                });
            });
        });
    },

    write: async function write(key, value, ttl) {
        try {
            await ClusterCache.set(key, value, ttl);
            return true;
        } catch (e) {
            return false;
        }
    },

    incBy: function incBy(key, incByValue) {
        return new Promise(function (ok, fail) {
            _repositories.pr.getWriteProcess(key, ClusterCache.options.storage).then(function (processes) {
                processes.forEach(function (proc) {
                    return new Promise(function (ok, fail) {
                        if (parseInt(proc) === parseInt(process.env.pm_id)) {
                            _repositories.dr.inc(key, incByValue);
                            return ok();
                        } else {
                            pm2.sendDataToProcessId(proc, {
                                data: {
                                    k: key,
                                    v: incByValue
                                },
                                topic: _const.TOPIC_INC
                            }, function (e) {});
                        }
                    });
                });
                return ok();
            });
        });
    },

    set: function set(key, value, ttl) {
        return new Promise(function (ok, fail) {
            if (typeof key !== "string") {
                return fail('non string value passed to key');
            }
            if (ttl === undefined) {
                ttl = ClusterCache.options.defaultTtl;
            }

            _repositories.pr.getWriteProcess(key, ClusterCache.options.storage).then(function (processes) {
                processes.forEach(async function (p) {
                    await ClusterCache._setToProc(key, value, ttl, p);
                });
                return ok((0, _metadata2.default)(processes));
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
    get: ClusterCache.read,
    set: ClusterCache.write,
    inc: ClusterCache.inc,
    dec: ClusterCache.dec,
    delete: ClusterCache.delete,
    keys: ClusterCache.keys,
    flush: ClusterCache.flush,
    init: ClusterCache.init,
    withMeta: function withMeta() {
        return {
            get: ClusterCache.get,
            set: ClusterCache.set
        };
    }
};