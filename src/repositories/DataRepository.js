import gc from '../GarbageCollector';

var DataRepository = {

    data: new Map(),

    keys: function () {
        DataRepository.optimize();
        return [ ...DataRepository.data.keys() ];
    },

    optimize: function () {
        DataRepository.data.forEach((record, key) => {
            if (!DataRepository.isValid(record)) {
                DataRepository.delete(key);
            }
        });
    },

    inc: function(key, byVal){
        if(DataRepository.data.has(key)){
            let value = DataRepository.data.get(key);
            value.v = parseInt(value.v) + byVal;
            DataRepository.data.set(key, value);
            return value.v;
        }
        return 0;
    },

    get: function (key) {
        return DataRepository.isValid(DataRepository.data.get(key)) ? DataRepository.data.get(key).v : '';
    },

    set: function (key, data) {
        DataRepository.data.delete(key);
        DataRepository.data.set(key, data);
        gc.start(1000);
    },

    delete: function (key) {
        DataRepository.data.delete(key);
    },

    flush: function () {
        DataRepository.data.clear();
    },

    isValid: function (record) {
        if (record === undefined) return false;

        var isValid = parseInt(record.t) >= parseInt(new Date().getTime());
        if (!isValid) {
            DataRepository.delete(record.k);
        }
        return isValid;
    }
};

module.exports = {
    get: DataRepository.get,
    set: DataRepository.set,
    inc: DataRepository.inc,
    delete: DataRepository.delete,
    flush: DataRepository.flush,
    optimize: DataRepository.optimize,
    keys: DataRepository.keys
};