const lighthouse = require('lighthouse'); //import lighthouse module so we can use it in code
const chromeLauncher = require('chrome-launcher'); //one of Lighthouse's dependencies (allows Node to launch Chrome)
const fs = require('fs')
const argv = require('yargs').argv;
const url = require ('url');
const glob = require('glob');
const path = require('path');


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
        let dirName = getDirectory(argv.url);
        const prevReports = glob(`${dirName}/*.json`, {
            sync: true
        });
        if (prevReports.length) {
            dates = [];
            for (report in prevReports) {
                dates.push(new Date(path.parse(prevReports[report]).name.replace(/_/g, ":")));
            }
            const max = dates.reduce(function (a, b) {
                return Math.max(a, b)
            });
            const recentReport = new Date(max).toISOString();

            const recentReportContents = (() => {
                const output = fs.readFileSync(
                    dirName + "/" + recentReport.replace(/:/g, "_") + ".json",
                    "utf8",
                    (err, results) => {
                        return results;
                    }
                );
            return JSON.parse(output);
            })();

            compareReports(recentReportContents, results.js);

        }
        fs.writeFile(`${dirName}/${results.js["fetchTime"].replace(/:/g, "_")}.json`, results.json, err => {
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

const compareReports = (from, to) => {
    const metricFilter = [
        "first-contentful-paint",
        "first-meaningful-paint",
        "speed-index",
        "estimated-input-latency",
        "total-blocking-time",
        "max-potential-fid",
        "time-to-first-byte",
        "first-cpu-idle",
        "interactive"
    ];

    const calcPercentageDiff = (from, to) => {
        const per = ((to - from) / from) * 100;
        return Math.round(per * 100) / 100;
    }

    for (let auditObj in from.audits) {
        if (metricFilter.includes(auditObj)) {
            const percentageDiff = calcPercentageDiff(
                from.audits[auditObj].numericValue,
                from.audits[auditObj].numericValue
            );
            let logColor = "\x1b[37m";
            const log = (() => {
            if (Math.sign(percentageDiff) === 1) {
                logColor = "\x1b[31m";
                return `${percentageDiff + "%"} slower`;
            } else if (Math.sign(percentageDiff) === 0) {
                return "unchanged";
            } else {
                logColor = "\x1b[32m";
                return `${percentageDiff + "%"} faster`;
            }
            })();
            console.log(logColor, `${from["audits"][auditObj].title} is ${log}`);
        }
    }
    // console.log(from["finalUrl"] + " " + from.audits["first-contentful-paint"].score);
    // console.log(to["finalUrl"] + " " + to.audits["first-contentful-paint"].score);
}