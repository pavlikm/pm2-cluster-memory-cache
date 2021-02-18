"use strict";

var _const = require("../const");

var pm2 = require("pm2");

var ProcessRepository = {

    getReadProcess: function getReadProcess(key, storage) {
        return new Promise(function (ok, fail) {
            key = key + '';
            if (storage === _const.STORAGE_SELF || storage === _const.STORAGE_ALL) {
                return ok([process.env.pm_id]);
            }
            return ok(ProcessRepository.findInCluster(key, storage));
        });
    },

    getWriteProcess: function getWriteProcess(key, storage) {
        return new Promise(function (ok, fail) {
            key = key + '';
            if (storage === _const.STORAGE_SELF) {
                return ok([process.env.pm_id]);
            }
            return ok(ProcessRepository.findInCluster(key, storage));
        });
    },

    findInCluster: function findInCluster(key, storage) {
        return new Promise(function (ok, fail) {
            pm2.connect(function () {
                pm2.list(function (err, processes) {
                    var nodes = [];
                    for (var p in processes) {
                        if (processes[p].name === process.env.name) {
                            nodes.push(parseInt(processes[p].pm_id));
                        }
                    }
                    switch (storage) {
                        case _const.STORAGE_ALL:
                            {
                                return ok([].concat(nodes));
                            }
                        case _const.STORAGE_MASTER:
                            {
                                return ok([Math.min.apply(Math, nodes)]);
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
            });
        });
    }
};

module.exports = {
    getReadProcess: ProcessRepository.getReadProcess,
    getWriteProcess: ProcessRepository.getWriteProcess
};