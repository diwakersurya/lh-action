const core = require('@actions/core');
const github = require('@actions/github');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const waitOn = require('wait-on');
const execa = require("execa");
const log = require('lighthouse-logger');
const { getWaitOnOptions, getChromeLauncherOptions}=require("./helper");

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
        console.log(lhr)
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
