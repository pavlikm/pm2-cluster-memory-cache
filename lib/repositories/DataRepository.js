'use strict';

var _GarbageCollector = require('../GarbageCollector');

var _GarbageCollector2 = _interopRequireDefault(_GarbageCollector);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var DataRepository = {

    data: new Map(),

    keys: function keys() {
        DataRepository.optimize();
        return [].concat(_toConsumableArray(DataRepository.data.keys()));
    },

    optimize: function optimize() {
        DataRepository.data.forEach(function (record, key) {
            if (!DataRepository.isValid(record)) {
                DataRepository.delete(key);
            }
        });
    },

    inc: function inc(key, byVal) {

        if (DataRepository.data.has(key)) {
            var value = DataRepository.data.get(key);
            value.v = parseInt(value.v) + byVal;
            DataRepository.data.set(key, value);
            return value.v;
        }
        return 0;
    },

    get: function get(key) {
        return DataRepository.isValid(DataRepository.data.get(key)) ? DataRepository.data.get(key).v : '';
    },

    set: function set(key, data) {
        DataRepository.data.delete(key);
        DataRepository.data.set(key, data);
        _GarbageCollector2.default.start(1000);
    },

    delete: function _delete(key) {
        DataRepository.data.delete(key);
    },

    flush: function flush() {
        DataRepository.data.clear();
    },

    isValid: function isValid(record) {
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