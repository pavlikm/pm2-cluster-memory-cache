var Metadata = function (candidates, final) {
    return {
        storedOn: candidates,
        readFrom: parseInt(final) || -1,
        servedBy: parseInt(process.env.pm_id)
    }
};

module.exports = Metadata;