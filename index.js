const core = require('@actions/core');
const github = require('@actions/github');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const execa = require("execa");
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

const child_process_options = { stdio: "inherit", shell: true };
async function execAndLog(type, cmd, options = child_process_options) {
    console.log(type, cmd)
    const { message } = await execa.command(cmd, options);
    if (message) {
        error("FAILED!!", message);
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
            const server = execAndLog("SERVER", "npm run start")

            const url = 'http://localhost:5000';

            // Use Puppeteer to launch headful Chrome and don't use its default 800x600 viewport.
            const browser = await puppeteer.launch({
                headless: false,
                defaultViewport: null,
            });
            const { lhr } = await lighthouse(url, {
                port: (new URL(browser.wsEndpoint())).port,
                output: 'json',
                logLevel: 'info',
            });

            console.log(`Lighthouse scores: ${Object.values(lhr.categories).map(c => c.score).join(', ')}`);

            await browser.close();
            await killNodeServer();
        } catch (e) {
            killNodeServer();
            console.error("FAILED!", e);
        }
    })();
} catch (error) {
    core.setFailed(error.message);
}
