'use strict';

var _repositories = require('./repositories');

var GarbageCollector = {

    timer: undefined,

    start: function start(ms) {
        if (GarbageCollector.timer === undefined) {
            GarbageCollector.timer = setInterval(function () {
                _repositories.dr.optimize();
            }, ms);
            GarbageCollector.timer.unref();
        }
    }
};

module.exports = {
    start: GarbageCollector.start
};