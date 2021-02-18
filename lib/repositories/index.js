'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _DataRepository = require('./DataRepository');

Object.defineProperty(exports, 'dr', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_DataRepository).default;
  }
});

var _ProcessRepository = require('./ProcessRepository');

Object.defineProperty(exports, 'pr', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_ProcessRepository).default;
  }
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }