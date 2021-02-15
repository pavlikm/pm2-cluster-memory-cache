const pm2 = require("pm2");
import {cr, dr, pr} from './repositories';
import {STORAGE_CLUSTER, TOPIC_GET, TOPIC_GET_RESPONSE, TOPIC_SET} from "./const";

var ClusterCache = {

    options: {
        storage: STORAGE_CLUSTER,
        defaultTtl: 1000
    },

    init: function (options) {
        Object.assign(ClusterCache.options, options);
        process.on('message', function (packet) {
            let data = packet.data;

            if (packet.topic === TOPIC_SET) {
                dr.set(data.k, data);
            }

            if (packet.topic === TOPIC_GET) {
                pm2.sendDataToProcessId(data.respond, {
                    data: dr.get(data.k),
                    callbackId: data.callbackId,
                    topic: TOPIC_GET_RESPONSE
                }, function () {
                });
            }

            if (packet.topic === TOPIC_GET_RESPONSE) {
                if (data != null && 'v' in data) {
                    cr.run(packet.callbackId, data.v);
                } else {
                    cr.run(packet.callbackId, undefined);
                }
                cr.delete(packet.callbackId);
            }
        });
        return this;
    },

    get: function (key, cb) {
        pr.getReadProcess(key, ClusterCache.options.storage).then(processes => {
            let randProc = processes[~~(Math.random() * processes.length)];
            ClusterCache._getFromProc(key, cb, randProc);
        });
    },

    _getFromProc: function (key, cb, proc) {
        if (parseInt(proc) === parseInt(process.env.pm_id)) {
            let data = dr.get(key);
            if (data !== undefined) {
                return cb(data.v);
            } else {
                return cb(undefined);
            }
        }
        let callbackId = cr.register(cb);
        pm2.sendDataToProcessId(proc, {
            data: {
                k: key,
                respond: process.env.pm_id,
                callbackId: callbackId
            },
            topic: TOPIC_GET
        }, function (e) {
        });
    },

    set: function (key, value, ttl, cb) {
        if(ttl === undefined){
            ttl = ClusterCache.options.defaultTtl;
        }
        pr.getWriteProcess(key, ClusterCache.options.storage).then(processes => {
            processes.forEach((p) => {
                ClusterCache._setToProc(key, value, ttl, cb, p);
            });
        });
    },

    _setToProc: function (key, value, ttl, cb, proc) {
        if (parseInt(proc) === parseInt(process.env.pm_id)) {
            let data = {
                k: key,
                v: value,
                t: new Date().getTime() + (ttl * 1000)
            };
            dr.set(key, data);
            if(cb !== undefined) return cb();
        } else {
            pm2.sendDataToProcessId(proc, {
                data: {
                    k: key,
                    v: value,
                    t: new Date().getTime() + (ttl * 1000)
                },
                topic: TOPIC_SET
            }, function (e) {

            });
        }
    }
};

module.exports = {
    get: ClusterCache.get,
    set: ClusterCache.set,
    init: ClusterCache.init
};