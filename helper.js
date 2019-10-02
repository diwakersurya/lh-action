const waitOnOptions = {
    resources: [
    ],
    delay: 1000, // initial delay in ms, default 0
    interval: 100, // poll interval in ms, default 250ms
    timeout: 30000, // timeout in ms, default Infinity
    tcpTimeout: 1000, // tcp timeout in ms, default 300ms
    window: 1000, // stabilization time in ms, default 750ms
    strictSSL: false
};

const chromeLauncherOptions = {
        chromeFlags: ['--show-paint-rects', '--headless', "--ignore-certificate-errors"],
        logLevel: 'info'
};


module.exports ={
    getWaitOnOptions=function(options){
        return Object.assign({}, waitOnOptions, options)
    },
    getChromeLauncherOptions=function (options) {
            return Object.assign({}, chromeLauncherOptions, options)
    }

}