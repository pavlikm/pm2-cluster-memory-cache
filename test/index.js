require('babel-register')({
    presets: ['env'],
    plugins: ['transform-async-to-generator']
});

require('./app.js');
