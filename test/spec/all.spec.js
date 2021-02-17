const frisby = require('frisby');
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
    setTimeout(done, 50);
});

describe('/storage type all', () => {

    it('should be able to read value', (done) => {
        axios.get(BASE_URL + "/set?key=foo&value=bar&ttl=500").then(res => {
            return frisby
                .get(BASE_URL + "/get?key=foo")
                .expect('status', 200)
                .expect('json', 'key', "foo")
                .expect('json', 'value', "bar") //from previous test
                .done(done);
        });

    });

    it('should store all keys on all processes', (done) => {
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
                    for (const [key, value] of Object.entries(res._json)) {
                        if (value.length !== 10) {
                            fail(); //all values must be on the same proc.
                        }
                    }
                    done();
                });
        });
    });
});


