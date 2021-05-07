"use strict";

var _const = require("../const");

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

require("to-item");

var pm2 = require("pm2");

var ProcessRepository = {

    processes: process.env.pm_id < 0 ? [-1] : [],

    init: function init() {
        if (process.env.pm_id >= 0 && ProcessRepository.processes.length === 0) {
            return ProcessRepository.findProcesses();
        } else return new Promise(function (ok) {
            ok(ProcessRepository.processes);
        });
    },

    getReadProcess: function getReadProcess(key, storage) {
        return ProcessRepository.init().then(function (nodes) {
            return new Promise(function (ok, fail) {
                key = key + '';
                if (storage.toLowerCase() === _const.STORAGE_SELF || storage.toLowerCase() === _const.STORAGE_ALL) {
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
                if (storage.toLowerCase() === _const.STORAGE_SELF) {
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
            switch (storage.toLowerCase()) {
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
                        return ok([key.to(nodes)]);
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