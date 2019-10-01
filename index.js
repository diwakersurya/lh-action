const core = require('@actions/core');
const github = require('@actions/github');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const waitOn = require('wait-on');
const execa = require("execa");

var wOpts = {
    resources: [
        'http://localhost:5000',
    ],
    delay: 1000, // initial delay in ms, default 0
    interval: 100, // poll interval in ms, default 250ms
    timeout: 30000, // timeout in ms, default Infinity
    tcpTimeout: 1000, // tcp timeout in ms, default 300ms
    window: 1000, // stabilization time in ms, default 750ms
    strictSSL: false
};

// try {
//     // `who-to-greet` input defined in action metadata file
//     const nameToGreet = core.getInput('who-to-greet');
//     console.log(`Hello ${nameToGreet}!`);
//     const time = (new Date()).toTimeString();
//     core.setOutput("time", time);
//     // Get the JSON webhook payload for the event that triggered the workflow
//     const payload = JSON.stringify(github.context.payload, undefined, 2)
//     console.log(`The event payload: ${payload}`);
// } catch (error) {
//     core.setFailed(error.message);
// }
const opts = {
    chromeFlags: ['--show-paint-rects','--headless']
};
function launchChromeAndRunLighthouse(url, opts, config = null) {
    return chromeLauncher.launch({ chromeFlags: opts.chromeFlags }).then(chrome => {
        opts.port = chrome.port;
        return lighthouse(url, opts, config).then(results => {
            // use results.lhr for the JS-consumeable output
            // https://github.com/GoogleChrome/lighthouse/blob/master/types/lhr.d.ts
            // use results.report for the HTML/JSON/CSV output as a string
            // use results.artifacts for the trace/screenshots/other specific case you need (rarer)
            return chrome.kill().then(() => results.lhr)
        });
    });
}
const child_process_options = { stdio: "inherit",shell:true };
async function execAndLog(type, cmd, options = child_process_options) {
    console.log(type, cmd)
    const { message } = await execa.command(cmd, options);
    if (message) {
        error("FAILED!!--------------", message);
    }
}
async function killNodeServer() {
    try {
        await execAndLog("Server", "kill $(lsof -t -i:5000)");
    } catch (error) { }
}
try {
    // `command` input defined in action metadata file
    // const command = core.getInput('command');
    // console.log(`Running following command ${command}!`);
    // Get the JSON webhook payload for the event that triggered the workflow
    //const payload = JSON.stringify(github.context.payload, undefined, 2)
    //console.log(`The event payload: ${payload}`);
    (async () => {
        try {
            const server = execa.command('npm run start', { stdio: "inherit", shell: true });
            await waitOn(wOpts);
            // once here, all resources are available
            const lhr = await launchChromeAndRunLighthouse('http://localhost:5000', opts);
            console.log(`Lighthouse scores: ${Object.values(lhr.categories).map(c => c.score).join(', ')}`);
            core.debug(await execa.command("curl http://localhost:5000"));
            await killNodeServer();
        } catch (e) {
            console.error("FAILED!!!!----------------", e);
            killNodeServer();
        }
    })();
} catch (error) {
    core.setFailed(error.message);
}
