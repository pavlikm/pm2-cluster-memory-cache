const frisby = require('frisby');
const ip = require("ip");
var pm2 = require('pm2');


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

describe('/storage type master', () => {
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

    it('should return cluster key map', (done) => {

        shell.exec('pm2 describe pm2cluster', {silent: true},  function(code, stdout, stderr) {
           console.log(stdout);
            let proceses = stdout.match(/[0-9]+\s-\sname pm2cluster?/g);
            let rows = stdout.match(/pm2clusterCache keys\s+.\s+([0-9])+?/g);
            //console.log(rows);
            let values = [];
            rows.forEach((key, row) => {
                //console.log(row);
                //let [trash, id] = row.split("|");
                //values[parseInt(proceses[key])] = parseInt(id);
            });
            //console.log(values);
            done();
        });
        /*shell.exec('pm2 show pm2cluster', function(code, stdout, stderr) {
            console.log('Program output:', stdout);
            console.log('Program stderr:', stderr);
            done();
        });*/

    })
});


