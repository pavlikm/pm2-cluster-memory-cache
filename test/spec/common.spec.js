const frisby = require('frisby');
const ip = require("ip");
const axios = require('axios');

var BASE_URL = "http://" + ip.address() + ":8080";


beforeEach(function (done) {
    setTimeout(done, 100);
});

describe('/every storage type', () => {
    it('should be able to set value', (done) => {
        return frisby
            .get(BASE_URL + "/set?key=foo&value=bar&ttl=10000")
            .expect('status', 200)
            .expect('json', 'key', 'foo')
            .done(done);
    });

    it('should be able to set value without ttl', (done) => {
        return frisby
            .get(BASE_URL + "/set?key=foo&value=bar")
            .expect('status', 200)
            .expect('json', 'key', 'foo')
            .done(done);
    });


    it('should return undefined on non-existing key', (done) => {
        return frisby
            .get(BASE_URL + "/get?key=foobar")
            .expect('status', 200)
            .expect('json', 'key', "foobar")
            .expect('json', 'value', "undefined")
            .done(done);
    });

    it('should return default value on non-existing key', (done) => {
        return frisby
            .get(BASE_URL + "/get?key=foobar&default=test")
            .expect('status', 200)
            .expect('json', 'key', "foobar")
            .expect('json', 'value', "test")
            .done(done);
    });

    it('should return default value on expired key', (done) => {
        setTimeout(function () {
            return frisby
                .get(BASE_URL + "/get?key=foo&default=undefined")
                .expect('status', 200)
                .expect('json', 'key', "foo")
                .expect('json', 'value', "undefined")
                .done(done);
        }, 1000);

    });

    it('should delete value from everywhere', (done) => {
        return frisby
            .get(BASE_URL + "/set?key=foo&value=bar&ttl=10000")
            .expect('status', 200)
            .expect('json', 'key', 'foo')
            .then(res => {
                axios.get(BASE_URL + '/delete?key=foo').then(res => {
                    return frisby
                        .get(BASE_URL + "/info")
                        .expect('status', 200)
                        .then(res => {
                            for (const [key, value] of Object.entries(res._json)) {
                                if (value.indexOf("foo") !== -1) {
                                    fail();
                                }
                            }
                            done();
                        })
                })
            })
    });

});


