const pm2 = require("pm2");
const crypto = require("crypto");
import metadata from './metadata';
import {dr, pr} from './repositories';
import pm2monitor from './pm2Monitor';
import {
    STORAGE_CLUSTER,
    STORAGE_SELF,
    STORAGE_ALL,
    STORAGE_MASTER,
    TOPIC_GET,
    TOPIC_SET,
    TOPIC_INC,
    TOPIC_DEC,
    TOPIC_DELETE,
    TOPIC_KEYS,
    TOPIC_FLUSH
} from "./const";


var ClusterCache = {

        initialized: false,
        options: {
            storage: STORAGE_CLUSTER,
            defaultTtl: 1000,
            logger: console
        },

        init: function (options) {
            if (ClusterCache.initialized) {
                if (options.storage && ClusterCache.options.storage !== options.storage) {
                    ClusterCache.options.logger.warn(`pm2-cluster-cache already initialized - storage changed to previous init value - '${ClusterCache.options.storage}'`);
                }
                if (options.defaultTtl && ClusterCache.options.defaultTtl !== options.defaultTtl) {
                    ClusterCache.options.logger.warn(`pm2-cluster-cache already initialized - defaultTtl changed to previous init value - '${ClusterCache.options.defaultTtl}'`);
                }
                return this;
            }
            if (options.defaultTtl && (typeof options.defaultTtl !== "number" || options.defaultTtl <= 0)) {
                ClusterCache.options.logger.warn(`invalid value defaultTtl, will use default value: ${ClusterCache.options.defaultTtl}`);
                delete options.defaultTtl;
            }
            if (options.storage && [STORAGE_CLUSTER, STORAGE_SELF, STORAGE_ALL, STORAGE_MASTER].includes(options.storage) === false) {
                ClusterCache.options.logger.warn(`invalid value storage, will use default value: ${ClusterCache.options.storage}`);
                delete options.storage;
            }
            Object.assign(ClusterCache.options, options);
            if (process.env.pm_id === undefined) {
                process.env.pm_id = -1;
                ClusterCache.options.storage = STORAGE_SELF;
                ClusterCache.options.logger.warn(`not running on pm2 - pm2-cluster-cache storage forced to '${STORAGE_SELF}'`);
            } else {
                pr.init();
                process.setMaxListeners(0);
            }

            process.on('message', function (packet) {
                let data = packet.data;

                if (packet.topic === TOPIC_SET) {
                    dr.set(data.k, data);
                }

                if (packet.topic === TOPIC_DELETE) {
                    dr.delete(data.k);
                }

                if (packet.topic === TOPIC_FLUSH) {
                    dr.flush();
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

                if (packet.topic === TOPIC_INC) {
                    let newValue = dr.inc(data.k, data.v);
                    pm2.sendDataToProcessId(data.respond, {
                        data: newValue,
                        topic: data.cb
                    }, function (e) {
                    });
                }

            });
            ClusterCache.initialized = true;
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

        generateRespondTopic: function () {
            return 'clusterCache' + crypto.randomBytes(16).toString("hex");
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

        flush: function () {
            return new Promise(async (ok, fail) => {
                let processes = await pr.getAll();
                processes.forEach(p => {

                    pm2.sendDataToProcessId(p, {
                        data: {},
                        topic: TOPIC_FLUSH
                    }, function (e) {
                        if (e) return fail();
                    });
                });
                return ok();
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

        inc: async function (key) {
            try {
                let val = await ClusterCache.read(key, null);
                if (val === null) {
                    await ClusterCache.set(key, 0);
                    return 0;
                }
                val = await ClusterCache.read(key, null);
                await ClusterCache.incBy(key, 1);
                return parseInt(val) + 1;
            } catch (e) {
            }
        },

        dec: async function (key) {
            try {
                let val = await ClusterCache.read(key, null);
                if (val === null) {
                    ClusterCache.write(key, 0);
                    return 0;
                } else {
                    await ClusterCache.incBy(key, -1);
                    return val - 1;
                }
            } catch (e) {
            }
        },

        read: async function (key, defaultValue) {
            try {
                let value = await ClusterCache.get(key, defaultValue);
                return value.data;
            } catch (e) {
                return defaultValue;
            }

        },

        get: function (key, defaultValue) {
            return new Promise((ok, fail) => {
                if (typeof key !== "string") {
                    return fail('non string value passed to key');
                }
                pr.getReadProcess(key, ClusterCache.options.storage).then(async processes => {
                    let randProc = processes[~~(Math.random() * processes.length)];
                    ClusterCache._getFromProc(key, randProc).then(value => {
                        if (value === undefined) {
                            pm2monitor.miss();
                            return ok({
                                data: defaultValue,
                                metadata: metadata([], randProc)
                            })
                        } else {
                            pm2monitor.hit();
                            return ok({
                                data: value,
                                metadata: metadata(processes, randProc)
                            });
                        }
                    }).catch(e => {
                        pm2monitor.miss();
                        return ok({
                            data: defaultValue,
                            metadata: metadata([], randProc)
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
                    if (err) fail();
                    process.prependOnceListener('message', function (packet) {
                        if (packet.topic === topic) {
                            return (packet.data !== '') ? ok(packet.data) : fail();
                        }
                    });
                });
            });
        },

        write: async function (key, value, ttl) {
            try {
                await ClusterCache.set(key, value, ttl);
                return true;
            } catch (e) {
                return false;
            }
        },

        incBy: function (key, incByValue) {
            return new Promise((ok, fail) => {
                pr.getWriteProcess(key, ClusterCache.options.storage).then(processes => {
                    processes.forEach((proc) => {
                        return new Promise((ok, fail) => {
                            if (parseInt(proc) === parseInt(process.env.pm_id)) {
                                dr.inc(key, incByValue);
                                return ok();
                            } else {
                                pm2.sendDataToProcessId(proc, {
                                    data: {
                                        k: key,
                                        v: incByValue,
                                    },
                                    topic: TOPIC_INC
                                }, function (e) {

                                });
                            }
                        });
                    });
                    return ok();
                });
            });
        },

        set: function (key, value, ttl) {
            return new Promise((ok, fail) => {
                if (typeof key !== "string") {
                    return fail('non string value passed to key');
                }
                if (ttl === undefined) {
                    ttl = ClusterCache.options.defaultTtl;
                }

                pr.getWriteProcess(key, ClusterCache.options.storage).then(processes => {
                    processes.forEach(async (p) => {
                        await ClusterCache._setToProc(key, value, ttl, p);
                    });
                    return ok(metadata(processes));
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
    get: ClusterCache.read,
    set: ClusterCache.write,
    inc: ClusterCache.inc,
    dec: ClusterCache.dec,
    delete: ClusterCache.delete,
    keys: ClusterCache.keys,
    flush: ClusterCache.flush,
    init: ClusterCache.init,
    withMeta: () => {
        return {
            get: ClusterCache.get,
            set: ClusterCache.set
        }
    }
};