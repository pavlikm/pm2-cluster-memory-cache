import {cr, dr} from './repositories';

var GarbageCollector = {

    timer: undefined,

    start: function (ms) {
        if (GarbageCollector.timer === undefined) {
            GarbageCollector.timer = setInterval(function () {
                dr.optimize();
                cr.optimize();
            }, ms);
        }
    }
};

module.exports = {
    start: GarbageCollector.start
};
