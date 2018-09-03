'use strict';

const https = require('https');
const aws = require('aws-sdk');
const s3 = new aws.S3();

const send_message = (mes) => {
    
    let opts = {
        hostname: 'hooks.slack.com',
        path: process.env.SLACK_PATH,
        headers: { "Content-type": "application/json;" },
        method: 'POST'
    };

    const params = {
        channel: process.env.SLACK_CHANNEL,
        username: process.env.SLACK_USERNAME, 
        text: mes, 
        icon_emoji: process.env.SLACK_ICON
    }

    const req = https.request(opts, (res) => {
        res.setEncoding('utf8');
        res.on('data', (r) => {
            console.log('send slack');
        }).on('error', (e) => {
            console.log('ERROR: ' + e.stack);
        });
    });
    
    req.write(JSON.stringify(params));
    req.end();
    
};

const getBody = (url) => {
    return new Promise ((resolve, reject) => {
        https.get(url, (r) => {
            let data = "";
            r.setEncoding('utf8');
            r.on('data', (d) => {
                data += d;
            });
            r.on('end', () => {
                resolve(data);
            }); 
        }).on('error', (e) => {
            reject(e);
        })
    });
};

const check_web = async (list) => {

    console.log("check_web start...");

    let now_data = "";
    let old_data = "x";

    try {

        // Now html
        await getBody(list.url).then((v) => {
            now_data = v;
        });

        // Old html
        await s3.getObject({
            Bucket: list.bucket,
            Key: list.key
        }).promise().then((data) => {
            old_data = data.Body.toString('utf8');
        });

        // Compare
        if (now_data !== old_data) {
            send_message(list.key + 'の更新がありました。');
            console.log("distinct");
            await s3.putObject({
                Body: now_data,
                Bucket: list.bucket,
                Key: list.key
            }).promise();
        }

    } catch (e) {
        console.error(e);
        send_message("Ooops, something went wrong...");
    }

    console.log("check_web end.");

};


exports.main = () => {

    const list = [
        {
            bucket: process.env.S3_BUCKET,
            key: process.env.S3_KEY,
            url: process.env.CHECK_URL
        }
    ];

    list.forEach((val) => {
        check_web(val);
    });

};

