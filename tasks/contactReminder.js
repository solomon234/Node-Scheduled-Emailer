const { sendEmail } = require('../service/emailService');
const sql = require('mssql');
const fs = require('fs');

var contactReminderTask = {
    EmailContactReminder: async (config) => {

        let mainPool = new sql.ConnectionPool(config.db);
        let mainPoolConnect = mainPool.connect();

        let transporter = nodemailer.createTransport(config.smtp);

        await mainPoolConnect; //checks if pool is connected
        try {
            console.log('Connection Established');
            let req = mainPool.request();
            let result = await req.query(
                "SELECT U_FNAME, U_LNAME, emailaddr, msgtext, custid, locid, currdate, userid, pname, ccaddr FROM eminders JOIN dbo.USERS ON U_USERID = USERID WHERE eminders.isdeleted = 0 AND CONVERT(VARCHAR(10), futuredate, 112) = CONVERT(VARCHAR(10), getdate(), 112) AND ( senttime is NULL or YEAR(senttime) = 1900)"
            );
            if (result.rowsAffected > 0) {
                for (let i = 0; i < result.recordset.length; i++) {
                    let req = mainPool.request();

                    let htmlBody = `${result.recordset[i].f_name}, <br />
                              this is the reminder you request on ${result.recordset[i].currdate}, 
                              for Customer ${result.recordset[i].cust_id}${result.recordset[i].loc_id ? '-'+result.recordset[i].loc_id : ''} ${result.recordset[i].msgtext}`;

                    let subject = `Automated Contact Reminder, [${result.recordset[i].cust_id}${result.recordset[i].loc_id ? '-'+result.recordset[i].loc_id : ''}]`;

                    if (!result.recordset[i].cust_id) {
                        htmlBody = `${result.recordset[i].f_name}, <br />
                              this is the reminder you request on ${result.recordset[i].currdate}, 
                              for ${result.recordset[i].pname}  ${result.recordset[i].msgtext}`

                        subject = `Automated Contact Reminder, [${result.recordset[i].pname}]`
                    }

                    let mailOptions = {
                        from: '"The Metro Group Inc." <auto-mail@metrogroupinc.com>', // sender address
                        to: emailsResult.recordset[0].emailaddr, // list of receivers                        
                        //to: 'smuratov@metrogroupinc.com',
                        subject: subject, // Subject line
                        html: htmlBody // html body
                    };

                    let today = new Date();
                    let dd = today.getDate();
                    let mm = today.getMonth() + 1;
                    let yyyy = today.getFullYear();

                    sendmail = async () => {
                        let resp = await sendEmail(config.smtp, mailOptions);
                        return resp;
                    };

                    let sendMailResp = await sendmail();
                    if (sendMailResp) {
                        let req = mainPool.request();
                        let insertResponse = await req
                            .input('sendname', sql.VarChar, result.recordset[i].u_fname + ' ' + result.recordset[i].u_lname)
                            .input('emailaddr', sql.VarChar, result.recordset[i].emailaddr)
                            .input('ccaddr', sql.VarChar, '')
                            .input('msgtext', sql.VarChar, htmlBody)
                            .input('msubject', sql.VarChar, subject)
                            .input('sentflag', sql.Bit, 1)
                            .input('senttime', sql.DateTime, new Date())
                            .input('cstamp', sql.VarChar, `AUTOSERV${yyyy}${mm}${dd}`)
                            .query(
                                'INSERT INTO mservice (sendname, emailaddr, ccaddr, msgtext, msubject,sentflag,senttime,cstamp) VALUES (@sendname, @emailaddr, @ccaddr, @msgtext, @msubject,@sentflag,@senttime,@cstamp)'
                            );
                        if (insertResponse.rowsAffected > 0) {
                            console.log('MSERVICE was added succesfully');                        
                        }
                    } 
                }
                //Close connection to DB
                mainPool.close();
            } else {
                mainPool.close();
            }
            console.log('Connection Closed');
        } catch (err) {
            console.log(err.message);
            process.exit;
            return err;
        }
    }
}
module.exports = contactReminderTask;