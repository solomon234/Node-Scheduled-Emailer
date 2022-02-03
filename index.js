const nodemailer = require('nodemailer');
const fs = require('fs');
const cron = require('node-cron');
const config = require('./config/config.json');

var { runTask } = require('./service/taskService');

console.log('Task Scheduler Started', new Date())

// loop through tasks in config file
for (const key in config.tasks) {
    
    let val = config.tasks[key].value;
    if (!config.tasks[key].active)
        config.tasks[key].duration = '';
    //useful resource - https://crontab.guru/#52_10_*_*_*

    try {
        switch (config.tasks[key].duration.toLowerCase()) {
            case 'minutes':
                cron.schedule(`*/${val} * * * *`, () => {
                    console.log(new Date(), key, `Runs every ${val} minutes`);
                    runTask(key, config);
                });    
                break;
            case 'sethour':                
                cron.schedule(`0 ${val} * * *`, () => {
                    console.log(`Running a job at ${val}:00 at America/New York timezone`);
                    runTask(key, config);
                  }, {
                    scheduled: true,
                    timezone: "America/New_York"
                  });
                break;
            case 'settime':                
            cron.schedule(`${val} * * *`, () => {
                let time = val.split(' ');
                console.log(`Running a job at ${time[1]}:${time[0] == '0' ? '00': time[0] } at America/New York timezone`);
                runTask(key, config);
                }, {
                scheduled: true,
                timezone: "America/New_York"
                });
            break;
            default:
                break;
        }
    } catch (e) {        
        console.log(e);
    }    
}