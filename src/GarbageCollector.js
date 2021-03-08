import {dr} from './repositories';

var GarbageCollector = {

    timer: undefined,

    start: function (ms) {
        if (GarbageCollector.timer === undefined) {
            GarbageCollector.timer = setInterval(function () {
                dr.optimize();
            }, ms);
            GarbageCollector.timer.unref();
        }
    }
};

module.exports = {
    start: GarbageCollector.start
};
