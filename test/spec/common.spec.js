const frisby = require('frisby');
const ip = require("ip");
const axios = require('axios');

var BASE_URL = "http://" + ip.address() + ":8080";

beforeEach(function (done) {
    axios.get(BASE_URL + "/flush").then(function () {
        done();
    })
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
        axios.get(BASE_URL + "/set?key=foo&value=bar&ttl=500").then(() => {
            setTimeout(function () {
                return frisby
                    .get(BASE_URL + "/get?key=foo&default=undefined")
                    .expect('status', 200)
                    .expect('json', 'key', "foo")
                    .expect('json', 'value', "undefined")
                    .done(done);
            }, 1000);
        });

    });

    it('should flush all keys', (done) => {
        let homer = axios.get(BASE_URL + "/set?key=homer&value=simpson&ttl=10000");
        let meggie = axios.get(BASE_URL + "/set?key=meggie&value=simpson&ttl=10000");
        let bart = axios.get(BASE_URL + "/set?key=bart&value=simpson&ttl=10000");
        let flush = axios.get(BASE_URL + "/flush");
        axios.all([homer, meggie, bart, flush]).then(resp => {
            return frisby
                .get(BASE_URL + "/info")
                .then(function (res) {
                    for (const [key, value] of Object.entries(res._json)) {
                        if (value.length !== 0) {
                            fail(); //all keys must be removed
                        }
                    }
                    done();
                });
        });
    });

    it('should inc key', (done) => {
        axios.get(BASE_URL + "/set?key=foo&value=100&ttl=1000").then(() => {
            return frisby
                .get(BASE_URL + "/inc?key=foo")
                .expect('status', 200)
                .expect('json', 'key', "foo")
                .expect('json', 'value', 101)
                .done(done);
        });
    });

    it('should dec key', (done) => {
        axios.get(BASE_URL + "/set?key=foo&value=100&ttl=1000").then(() => {
            return frisby
                .get(BASE_URL + "/dec?key=foo")
                .expect('status', 200)
                .expect('json', 'key', "foo")
                .expect('json', 'value', 99)
                .done(done);
        });

    });

    it('should inc and dec not exist key', (done) => {
        frisby
            .get(BASE_URL + "/dec?key=dec")
            .expect('status', 200)
            .expect('json', 'key', "dec")
            .expect('json', 'value', 0)
            .done(done);
        frisby
            .get(BASE_URL + "/inc?key=inc")
            .expect('status', 200)
            .expect('json', 'key', "inc")
            .expect('json', 'value', 0)
            .done(done);
    });


});


