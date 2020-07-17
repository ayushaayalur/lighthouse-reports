const lighthouse = require('lighthouse'); //import lighthouse module so we can use it in code
const chromeLauncher = require('chrome-launcher'); //one of Lighthouse's dependencies (allows Node to launch Chrome)
const fs = require('fs')
const argv = require('yargs').argv;
const url = require ('url');


/*
 script to open Chrome, run a Lighthouse audit, and print report to console
*/

const launchChromeAndRunLighthouse = (url) => {
    return chromeLauncher.launch().then(chrome => {
        const opts = {port : chrome.port};
        return lighthouse(url, opts).then(results => {
            return chrome.kill().then(() => {
                return {
                    js: results.lhr, 
                    json: results.report
                }
            });
        });
    });
};

if (argv.url) {
    launchChromeAndRunLighthouse(argv.url).then(results => {
        fs.writeFile(`${getDirectory(argv.url)}/${results.js["fetchTime"].replace(/:/g, "_")}.json`, results.json, err => {
            if(err) throw err;
        });
    });
} else {
    throw "You haven't passed a URL to Lighthouse";
}




// HELPER FUNCTIONS //

function getDirectory (url) {
    const urlObj = new URL(url);
    let dirName = urlObj.host.replace("www.", "");
    if (urlObj.pathname !== "/") {
        dirName = dirName + urlObj.pathname.replace(/\//g, "_");
    }
    if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName);
    }
    return dirName
}