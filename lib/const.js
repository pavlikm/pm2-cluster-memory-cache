'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var STORAGE_ALL = exports.STORAGE_ALL = 'all';
var STORAGE_CLUSTER = exports.STORAGE_CLUSTER = 'cluster';
var STORAGE_MASTER = exports.STORAGE_MASTER = 'master';
var STORAGE_SELF = exports.STORAGE_SELF = 'self';

var TOPIC_SET = exports.TOPIC_SET = 'clusterCache:set';
var TOPIC_GET = exports.TOPIC_GET = 'clusterCache:get';
var TOPIC_DELETE = exports.TOPIC_DELETE = 'clusterCache:del';
var TOPIC_KEYS = exports.TOPIC_KEYS = 'clusterCache:keys';
var TOPIC_FLUSH = exports.TOPIC_FLUSH = 'clusterCache:flush';