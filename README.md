[![Node.js CI](https://github.com/pavlikm/pm2-cluster-memory-cache/actions/workflows/node-build.yml/badge.svg)](https://github.com/pavlikm/pm2-cluster-memory-cache/actions/workflows/node-build.yml)
[![CodeQL](https://github.com/pavlikm/pm2-cluster-memory-cache/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/pavlikm/pm2-cluster-memory-cache/actions/workflows/codeql-analysis.yml)


# pm2 cluster memory cache
A cluster memory cache for pm2 with some different possibilities of data store. 
From version 1.0.5 is safe to use without pm2 too, but storage type will be forced to 'self'.

### Instalation
```javascript
npm install pm2-cluster-cache --save
```

### Tests
```javascript
npm run test
```
**Remember**: testing environment may vary depending on storage types. Therefore tests are divided into 4 separate running tests. If you run `npm run test`, all test will be performed, but you can run specific test, for example `npm run test-cluster` for cluster type, or `npm run test-master` for master type, and so on. Every test will create server with max processes, and test against api running on this cluster server.
 

### Usage
```javascript
const pm2ClusterCache = require('pm2-cluster-cache');
let cache = pm2ClusterCache.init({storage: "cluster"});

//set value to cache for 1s
cache.set('key', 'data', 1000).then(() => {
    console.log('ok');
});

//get cached value
cache.get('key', "someDefaultValue").then(result => {
    console.log(result);
}); 

//get value from cache with metadata
cache.withMeta().get('key', "someDefaultValue").then(result => {
    console.log(result.data);
    console.log(result.metadata);
});

//get cluster data map
cache.keys().then(map => {
    console.log(map);
});
```

### API

- `init(options)` - create new cluster cache. Options object can have following keys:
  - `defaultTtl` - default time to live for keys in ms. Default value is `1000`ms.
  - `logger` - default console. May be any class with impemented methods `log` and `warn`.
  - `storage` - can be one of `self`, `all`, `master`, `cluster`. Default value is `cluster`. 
    - `self` - store to actual process, read from actual process. Every process has his own cache, so this cache is not shared between processes.
    - `all` - store to all processes, read from actual process. Data are duplicated and on every process is stored full replica of all data. If one process restarts, other process are not affected with cache misses.
    - `master` - store to master, read from master. If actual process restarts, other process are not affected with cache miss, if actual process is not master. If master restarts, every process in cluster will lost all cached data.
    - `cluster` - store to specific process, read from specific process. Every process in cluster has part of data, so if one process restarts, other process will lost only part of data. Targer process for storage is detemined by key. 
- `set(key, value, [ttl])` - store value under key, with given ttl (in ms).
- `get(key, [defaultValue])` - get value stored under key 'key'.
- `delete(key)` - removes key from all process where is given key stored. Returns in Promise array of processes deleted from.
- `flush()` - removes all keys from all processes.
- `keys()` - returns in Promise map of cluster with numbers of stored keys.
- `withMeta()` - returns decorated `get` and `set` method that are returning metadata with data.
---
`metadata` object is object with keys:
- `storedOn` - array of int. Processes that have key stored.
- `readFrom` - int. Proccess which provided data.
- `servedBy` - int. Actual process. 


### PM2 metrics
with command `pm2 describe <your app name>` you can see in Code metrics cache hit rate and miss rate on every process.

