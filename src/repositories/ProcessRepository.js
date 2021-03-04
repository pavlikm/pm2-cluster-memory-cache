import {STORAGE_ALL, STORAGE_CLUSTER, STORAGE_MASTER, STORAGE_SELF} from "../const";
import metadata from "../metadata";

const pm2 = require("pm2");

var ProcessRepository = {

    processes: process.env.pm_id < 0 ? [-1] : [],

    init: function () {
        if (process.env.pm_id >= 0 && ProcessRepository.processes.length === 0) {
            return ProcessRepository.findProcesses();
        } else return new Promise(ok => {
            ok(ProcessRepository.processes);
        });
    },

    getReadProcess: function (key, storage) {
        return ProcessRepository.init().then(nodes => {
            return new Promise(function (ok, fail) {
                key = key + '';
                if (storage.toLowerCase() === STORAGE_SELF || storage.toLowerCase() === STORAGE_ALL) {
                    return ok([process.env.pm_id]);
                }
                return ok(ProcessRepository.findInCluster(key, storage, nodes));
            })
        })

    },

    getWriteProcess: function (key, storage) {
        return ProcessRepository.init().then(nodes => {
            return new Promise(function (ok, fail) {
                key = key + '';
                if (storage.toLowerCase() === STORAGE_SELF) {
                    return ok([process.env.pm_id]);
                }
                return ok(ProcessRepository.findInCluster(key, storage, nodes));
            })
        })
    },

    findProcesses: function () {
        return new Promise(function (ok, fail) {
            pm2.connect(function (err) {
                pm2.list(function (err, proc) {
                    if (err) {
                        return ok([]);
                    }
                    var nodes = [];
                    for (var p in proc) {
                        if (proc[p].name === process.env.name) {
                            nodes.push(parseInt(proc[p].pm_id));
                        }
                    }
                    if(nodes.length > 0){
                        ProcessRepository.processes = nodes;
                    }
                    return ok(nodes);
                });
            });
        });
    },

    findInCluster: function (key, storage, nodes) {
        return new Promise(async function (ok, fail) {
            switch (storage.toLowerCase()) {
                case STORAGE_ALL: {
                    return ok([...nodes]);
                }
                case STORAGE_MASTER: {
                    return ok([Math.min(...nodes)]);
                }
                default:
                case STORAGE_CLUSTER: {
                    var h = 0, i = key.length;
                    while (i > 0) {
                        h = (h << 5) - h + key.charCodeAt(--i) | 0;
                    }
                    h = Math.abs(h);

                    for (var j = 0; j <= 9; j++) {
                        for (var k = 0; k < nodes.length; k++) {
                            var node = nodes[k];
                            if ((h % 10) === node) {
                                return ok([node]);
                            }
                        }
                        h = parseInt(('' + h).substring(1) + ('' + h)[0]);
                    }
                    return ok([nodes[0]]);
                }
            }
        })
    }
};

module.exports = {
    getReadProcess: ProcessRepository.getReadProcess,
    getWriteProcess: ProcessRepository.getWriteProcess,
    getAll: ProcessRepository.findProcesses,
    init: ProcessRepository.init
};