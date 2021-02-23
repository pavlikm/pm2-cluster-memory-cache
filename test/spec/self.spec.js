const ip = require("ip");
var pm2 = require('pm2');
const axios = require('axios');

var BASE_URL = "http://" + ip.address() + ":8080";

afterAll((done) => {
    pm2.connect(function (err) {
        pm2.delete('pm2cluster', (err, proc) => {
            done();
        });
    });
});

beforeEach(function (done) {
    axios.get(BASE_URL + "/flush").then(function () {
        done();
    })
});

describe('/storage type self', () => {

    it('should be able to read value', (done) => {
        done(); //can't test, because from definition of type 'self' may not return value, if read request fall on different proccess as write request
    });

    it('should store all keys on one process', (done) => {
        done(); //todo how to prevent, that all requests fall to same proc?
    });
});


