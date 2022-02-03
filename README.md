# MetroMailer
### Dependencies
* mssql
* node-cron
* moment
* moment-business-days

### References
* https://www.npmjs.com/package/node-cron
* https://crontab.guru/ (Reference for timing)

### Setup
1. Clone repo to local directory 
2. Edit config/config.json
a. Set desired DB connection to active
b. Set smtp creds 
3. Run npm start


### Adding More Tasks
> Important Note - if stored in mservice table, no js file needs to be created should be plug and play
1. For any new tasks create a new js file within the tasks folder add sql query and follow similar logic as other tasks.
2. Add the new task into config.json, assign the duration (please see index.js for the available options), value which can be a string and active.
3. Run npm start 
