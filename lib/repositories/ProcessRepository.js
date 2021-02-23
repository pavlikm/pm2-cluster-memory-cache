"use strict";

var _const = require("../const");

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var pm2 = require("pm2");

var ProcessRepository = {

    processes: [],

    init: function init() {
        if (ProcessRepository.processes.length === 0) {
            return ProcessRepository.findProcesses();
        } else return new Promise(function (ok) {
            ok(ProcessRepository.processes);
        });
    },

    getReadProcess: function getReadProcess(key, storage) {
        return ProcessRepository.init().then(function (nodes) {
            return new Promise(function (ok, fail) {
                key = key + '';
                if (storage === _const.STORAGE_SELF || storage === _const.STORAGE_ALL) {
                    return ok([process.env.pm_id]);
                }
                return ok(ProcessRepository.findInCluster(key, storage, nodes));
            });
        });
    },

    getWriteProcess: function getWriteProcess(key, storage) {
        return ProcessRepository.init().then(function (nodes) {
            return new Promise(function (ok, fail) {
                key = key + '';
                if (storage === _const.STORAGE_SELF) {
                    return ok([process.env.pm_id]);
                }
                return ok(ProcessRepository.findInCluster(key, storage, nodes));
            });
        });
    },

    findProcesses: function findProcesses() {
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
                    if (nodes.length > 0) {
                        ProcessRepository.processes = nodes;
                    }
                    return ok(nodes);
                });
            });
        });
    },

    findInCluster: function findInCluster(key, storage, nodes) {
        return new Promise(async function (ok, fail) {
            switch (storage) {
                case _const.STORAGE_ALL:
                    {
                        return ok([].concat(_toConsumableArray(nodes)));
                    }
                case _const.STORAGE_MASTER:
                    {
                        return ok([Math.min.apply(Math, _toConsumableArray(nodes))]);
                    }
                default:
                case _const.STORAGE_CLUSTER:
                    {
                        var h = 0,
                            i = key.length;
                        while (i > 0) {
                            h = (h << 5) - h + key.charCodeAt(--i) | 0;
                        }
                        h = Math.abs(h);

                        for (var j = 0; j <= 9; j++) {
                            for (var k = 0; k < nodes.length; k++) {
                                var node = nodes[k];
                                if (h % 10 === node) {
                                    return ok([node]);
                                }
                            }
                            h = parseInt(('' + h).substring(1) + ('' + h)[0]);
                        }
                        return ok([nodes[0]]);
                    }
            }
        });
    }
};

module.exports = {
    getReadProcess: ProcessRepository.getReadProcess,
    getWriteProcess: ProcessRepository.getWriteProcess,
    getAll: ProcessRepository.findProcesses,
    init: ProcessRepository.init
};