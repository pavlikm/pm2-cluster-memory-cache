import gc from '../GarbageCollector';

var DataRepository = {

    data: {},

    optimize: function () {
        for (const [key, record] of Object.entries(DataRepository.data)) {
            if (!DataRepository.isValid(record)) {
                DataRepository.delete(key);
            }
        }

    },

    get: function (key) {
        return DataRepository.isValid(DataRepository.data[key]) ? DataRepository.data[key] : undefined;
    },

    set: function (key, data) {
        DataRepository.data[key] = data;
        gc.start(1000);
    },

    delete: function (key) {
        delete DataRepository.data[key];
    },

    isValid: function (record) {
        if (record === undefined) return false;

        var isValid = record.t >= new Date().getTime();
        if (!isValid) {
            DataRepository.delete(record.k);
        }
        return isValid;
    }
};

module.exports = {
    get: DataRepository.get,
    set: DataRepository.set,
    delete: DataRepository.delete,
    optimize: DataRepository.optimize
};