var io = undefined;
if(process.env.pm_id >= 0){
    io = require('@pm2/io');
} else {
    io = {
        meter: () => {
            return {
                mark: () => {}
            }
        }
    }
}

var pm2monitor = {
    hit: io.meter({
        name: 'Cluster Cache hit Rate',
        samples: 1,
        timeframe: 1,
        unit: 'hit/s'
    }),
    miss: io.meter({
        name: 'Cluster Cache miss Rate',
        samples: 1,
        timeframe: 1,
        unit: 'miss/s'
    }),
    markHit: function () {
        if (process.env.pm_id >= 0) pm2monitor.hit.mark();
    },
    markMiss: function () {
        if (process.env.pm_id >= 0) pm2monitor.miss.mark();
    }
};

module.exports = {
    hit: pm2monitor.markHit,
    miss: pm2monitor.markMiss
};