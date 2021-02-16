const frisby = require('frisby');
const ip = require("ip");
var pm2 = require('pm2');

var BASE_URL = "http://" + ip.address() + ":8080";

beforeAll((done) => {
    console.log("Starting cluster for 'cluster'");
    done();
});

afterAll((done) => {
    pm2.connect(function (err) {
        pm2.delete('pm2cluster', (err, proc) => {
            done();
        });
    });
});

beforeEach(function (done) {
    setTimeout(done, 50);
});

describe('/storage type cluster', () => {
    it('should be able to set value', (done) => {
        return frisby
            .get(BASE_URL + "/set?key=foo&value=bar")
            .expect('status', 200)
            .expect('json', 'status', true)
            .done(done);
    });

    it('should be able to read value', (done) => {
        return frisby
            .get(BASE_URL + "/get?key=foo")
            .expect('status', 200)
            .expect('json', 'key', "foo")
            .expect('json', 'value', "bar")
            .done(done);
    });

    it('should return null on non-existing key', (done) => {
        return frisby
            .get(BASE_URL + "/get?key=foobar")
            .expect('status', 200)
            .expect('json', 'key', "foobar")
            .expect('json', 'value', null)
            .done(done);
    });
});


