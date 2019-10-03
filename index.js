const core = require('@actions/core');
const github = require('@actions/github');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const waitOn = require('wait-on');
const execa = require("execa");
const log = require('lighthouse-logger');
var FormData = require('form-data');

const CDP = require('chrome-remote-interface');
const argv = require('minimist')(process.argv.slice(2));
const file = require('fs');


const format = 'png';
const viewportWidth = 1440;
const viewportHeight = 900;
const delay = 0;
const fullPage = true;

// Start the Chrome Debugging Protocol
async function takeScreenshot(port,url) {
    const client = await CDP();
  // Extract used DevTools domains.
  const {DOM, Emulation, Network, Page} = client;

  // Enable events on domains we are interested in.
  await Page.enable();
  await DOM.enable();
  await Network.enable();

  // Set up viewport resolution, etc.
  const deviceMetrics = {
    width: viewportWidth,
    height: viewportHeight,
    deviceScaleFactor: 0,
    mobile: false,
    fitWindow: false
  };
  await Emulation.setDeviceMetricsOverride(deviceMetrics);
  await Emulation.setVisibleSize({width: viewportWidth, height: viewportHeight});

  // Navigate to target page
  await Page.navigate({url});

  // Wait for page load event to take screenshot
  Page.loadEventFired(async () => {
    // If the `full` CLI option was passed, we need to measure the height of
    // the rendered page and use Emulation.setVisibleSize
    if (fullPage) {
      const {root: {nodeId: documentNodeId}} = await DOM.getDocument();
      const {nodeId: bodyNodeId} = await DOM.querySelector({
        selector: 'body',
        nodeId: documentNodeId,
      });
      const {model: {height}} = await DOM.getBoxModel({nodeId: bodyNodeId});

      await Emulation.setVisibleSize({width: viewportWidth, height: height});
      // This forceViewport call ensures that content outside the viewport is
      // rendered, otherwise it shows up as grey. Possibly a bug?
      await Emulation.forceViewport({x: 0, y: 0, scale: 1});
    }

    setTimeout(async function() {
      const screenshot = await Page.captureScreenshot({format});
      const buffer = new Buffer(screenshot.data, 'base64');
        var form = new FormData();
        form.append('data', buffer, { filename : 'screenshot.png' });
        form.submit('https://files.thetechlead.in/upload', function(err, res) {
        if (err) throw err;
        console.log('Done!!!!',res);
    });
    }, delay);
  });
}






const { getWaitOnOptions, getChromeLauncherOptions}=require("./helper");

function launchChromeAndRunLighthouse(url, opts, config = null) {
    return chromeLauncher.launch({ chromeFlags: opts.chromeFlags,startingUrl: url }).then(chrome => {
        opts.port = chrome.port;
        return takeScreenshot(opts.port,url).then(()=>chrome.kill().then(() => {success:"true"}))
        // return lighthouse(url, opts, config).then(results => {
        //     chrome.
        //     // use results.lhr for the JS-consumeable output
        //     // https://github.com/GoogleChrome/lighthouse/blob/master/types/lhr.d.ts
        //     // use results.report for the HTML/JSON/CSV output as a string
        //     // use results.artifacts for the trace/screenshots/other specific case you need (rarer)
        //     return chrome.kill().then(() => results.lhr)
        // });
    });
}

function getOverallScores(lhr) {
    const cats = Object.keys(lhr.categories);
    const obj = {};
    for (const cat of cats) {
        obj[cat] = lhr.categories[cat].score * 100;
    }
    return obj;
}
function getPRInfo(payload){
    const {number}=payload;
    const nwo = process.env['GITHUB_REPOSITORY'] || '/'
    const [owner, repo] = nwo.split('/');
    return {owner,repo,number}
}
async function postLighthouseComment(octokit,prInfo={}, lhr) {
    let rows = '';
    Object.values(lhr.categories).forEach(cat => {
        //const threshold = thresholds[cat.id] || '-';
        rows += `| ${cat.title} | ${cat.score * 100}\n`;
    });

    const body = `
Updated [Lighthouse](https://developers.google.com/web/tools/lighthouse/) report for the changes in this PR:
| Category | Score | Required threshold |
| ------------- | ------------- | ------------- |
${rows}
_Tested with Lighthouse version: ${lhr.lighthouseVersion}_`;

    const scores = getOverallScores(lhr);

    // eslint-disable-next-line no-unused-vars
    return octokit.issues.createComment(Object.assign({ body }, prInfo)).then(status => scores);
}

function startServer(command){
    const server = execa.command(command, { stdio: "inherit", shell: true });
    return server;
}
/** wait till the node server starts serving */
async function waitOnServer(url){
    const wOpts=getWaitOnOptions({resources:[url]})
    console.log(">>>>>>",wOpts)
    return waitOn(wOpts);
}
/** setup logging options for lighthouse */
function setUpChromeLauncher() {
    const clOpts = getChromeLauncherOptions({})
    log.setLevel(clOpts.logLevel);
    return clOpts;
}
async function killServer(server){
    if(!!server){
        server.cancel()
        try {
            await server;
        } catch (error) {
            console.log("Server Killed!!")
        }
    }

}




let server =null;
(async ()=>{
try {
        /**command to run for starting the server */
        const command = core.getInput('command');
        /**url to hit after the server is available */
        const url = core.getInput('url');
        const comment = core.getInput('comment')||true;
        const resultUrl=core.getInput('resultUrl')||null;

        console.log(command,url,comment,resultUrl)
        const payload = JSON.stringify(github.context.payload, undefined, 2)
        server = startServer(command);
        /** wait till the server is available */
        await waitOnServer(url)
        // once here, all resources are available
        const clOpts=setUpChromeLauncher()
        const lhr = await launchChromeAndRunLighthouse(url, clOpts);
       // console.log(lhr)
       console.log(`Lighthouse scores: ${Object.values(lhr.categories).map(c => c.score).join(', ')}`);
         if(comment){
            const prInfo=getPRInfo(github.context.payload);
            const token=process.env["GITHUB_TOKEN"];
            console.log(">>>>>>>>>",token)
            if(typeof token !== "undefined"){
                const octokit=new github.Github(token);
                await postLighthouseComment(octokit, prInfo,lhr)
            }
        }
        if(!!resultUrl){
            //send to database
        }
        await killServer(server);
} catch (error) {
    killServer(server);
    core.setFailed(error.message);
}
})()
