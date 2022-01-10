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
    
    try {
        switch (config.tasks[key].duration.toLowerCase()) {
            case 'minutes':
                cron.schedule(`*/${val} * * * *`, () => {
                    console.log(new Date(), key, `Runs every ${val} minutes`);
                    runTask(key, config);
                });        
                break;           
            case 'setHour':
                cron.schedule(`${val} * * *`, () => {
                    console.log(`Running a job at ${val.split(' ').join('')}:00 at America/New York timezone`);
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