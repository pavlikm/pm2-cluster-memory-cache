const frisby = require('frisby');
const Joi = frisby.Joi;
const ip = require("ip");
const axios = require('axios');

var BASE_URL = "http://" + ip.address() + ":8080";

beforeEach(function (done) {
    axios.get(BASE_URL + "/flush").then(function () {
        done();
    })
});

describe('/storage type cluster', () => {

    it('should be able to read value', (done) => {
        axios.get(BASE_URL + "/set?key=test&value=bar&ttl=10000").then(res => {
            return frisby
                .get(BASE_URL + "/get?key=test")
                .expect('status', 200)
                .expect('json', 'key', "test")
                .expect('json', 'value', "bar")
                .done(done);
        });
    });

    it('should return metadata on get', (done) => {
        axios.get(BASE_URL + "/set?key=homer&value=simpson&ttl=10000").then(() => {
            return frisby
                .get(BASE_URL + "/get?key=homer")
                .expect('status', 200)
                .expect('json', 'key', 'homer')
                .expect('json', 'value', 'simpson')
                .expect('jsonTypes', 'metadata', Joi.object())
                .done(done);
        });
    });

    it('should return only value on read', (done) => {
        axios.get(BASE_URL + "/set?key=homer&value=simpson&ttl=10000").then(() => {
            return frisby
                .get(BASE_URL + "/read?key=homer")
                .expect('status', 200)
                .expect('json', 'key', 'homer')
                .expect('json', 'value', 'simpson')
                .done(done);
        });
    });

    it('should delete value from all stored processes', (done) => {
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

    it('should store keys on different processes', (done) => {
        let homer = axios.get(BASE_URL + "/set?key=homer&value=simpson&ttl=10000");
        let meggie = axios.get(BASE_URL + "/set?key=meggie&value=simpson&ttl=10000");
        let bart = axios.get(BASE_URL + "/set?key=bart&value=simpson&ttl=10000");
        let lisa = axios.get(BASE_URL + "/set?key=lisa&value=simpson&ttl=10000");
        let marge = axios.get(BASE_URL + "/set?key=marge&value=simpson&ttl=10000");
        let montgomery = axios.get(BASE_URL + "/set?key=montgomery&value=burns&ttl=10000");
        let net = axios.get(BASE_URL + "/set?key=net&value=flanders&ttl=10000");
        let nelson = axios.get(BASE_URL + "/set?key=nelson&value=muntz&ttl=10000");
        let edna = axios.get(BASE_URL + "/set?key=edna&value=krabappel&ttl=10000");
        let krusty = axios.get(BASE_URL + "/set?key=krusty&value=theClown&ttl=10000");
        axios.all([homer, meggie, bart, lisa, marge, montgomery, net, nelson, edna, krusty]).then(resp => {
            return frisby
                .get(BASE_URL + "/info")
                .then(function (res) {
                    let count = 0;
                    for (const [key, value] of Object.entries(res._json)) {
                        if (value.length > 0) {
                            if (value.length === 10) fail(); //all are on one? That's bad
                            count += value.length;
                        }
                    }
                    if (count === 10) {
                        done();
                    } else {
                        fail();
                    }
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


