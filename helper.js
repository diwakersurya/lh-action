

const chromeLauncherOptions = {
        chromeFlags: ['--show-paint-rects', '--headless', "--ignore-certificate-errors","--disable-gpu","--allow-insecure-localhost"],
        logLevel: 'error'
};


module.exports ={
    getChromeLauncherOptions:function (options) {
            return Object.assign({}, chromeLauncherOptions, options={})
    }

}