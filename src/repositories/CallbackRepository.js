var CallbackRepository = {

    callbacks: {},

    optimize: function () {
        for (const [key, cb] of Object.entries(CallbackRepository.callbacks)) {
            if (parseInt(key.split("#").shift()) < new Date().getTime() + (3 * 1000)) {
                CallbackRepository.delete(key);
            }
        }
    },

    run: function (cbId, data) {
        if (CallbackRepository.callbacks.hasOwnProperty(cbId)) {
            ClusterCache.callbacks[cbId](data);
        }
    },

    register: function (cb) {
        let callbackId = new Date().getTime() + "#" + Math.random();
        CallbackRepository.callbacks[callbackId] = cb;
        return callbackId;
    },

    delete: function (key) {
        delete CallbackRepository.callbacks[key];
    }
};

module.exports = {
    run: CallbackRepository.run,
    reigster: CallbackRepository.register,
    delete: CallbackRepository.delete,
    optimize: CallbackRepository.optimize
};