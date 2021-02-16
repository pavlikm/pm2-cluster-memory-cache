var pm2 = require('pm2');

pm2.connect(function (err) {
    if (err) {
        console.error(err);
        process.exit(2);
    }

    pm2.start('ecosystem.json', function (err, apps) {
        pm2.disconnect();   // Disconnects from PM2
        if (err) throw err
    });
});

