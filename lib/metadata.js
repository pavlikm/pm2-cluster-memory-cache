"use strict";

var Metadata = function Metadata(candidates, final) {

    return process.env.pm_id > 0 ? {
        storedOn: candidates,
        readFrom: parseInt(final) || -1,
        servedBy: parseInt(process.env.pm_id)
    } : {
        storedOn: [],
        readFrom: NaN,
        servedBy: NaN
    };
};

module.exports = Metadata;