'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _GarbageCollector = require('../GarbageCollector');

var _GarbageCollector2 = _interopRequireDefault(_GarbageCollector);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var DataRepository = {

    data: {},

    keys: function keys() {
        return Object.keys(DataRepository.data);
    },

    optimize: function optimize() {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = Object.entries(DataRepository.data)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var _step$value = _slicedToArray(_step.value, 2),
                    key = _step$value[0],
                    record = _step$value[1];

                if (!DataRepository.isValid(record)) {
                    DataRepository.delete(key);
                }
            }
        } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion && _iterator.return) {
                    _iterator.return();
                }
            } finally {
                if (_didIteratorError) {
                    throw _iteratorError;
                }
            }
        }
    },

    get: function get(key) {
        return DataRepository.isValid(DataRepository.data[key]) ? DataRepository.data[key].v : '';
    },

    set: function set(key, data) {
        DataRepository.data[key] = data;
        _GarbageCollector2.default.start(1000);
    },

    delete: function _delete(key) {
        delete DataRepository.data[key];
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
    delete: DataRepository.delete,
    optimize: DataRepository.optimize,
    keys: DataRepository.keys
};