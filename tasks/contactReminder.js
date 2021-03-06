const { sendEmail } = require('../service/emailService');
const sql = require('mssql');
const fs = require('fs');

var contactReminderTask = {
    EmailContactReminder: async (config) => {

        let mainPool = new sql.ConnectionPool(config.test.active ? config.test : config.prod);
        let mainPoolConnect = mainPool.connect();


        await mainPoolConnect; //checks if pool is connected
        try {
            console.log('Connection Established');
            let req = mainPool.request();
            let result = await req.query(
                "SELECT top 25 eminders.id_pk ,U_FNAME, U_LNAME, emailaddr, msgtext, custid, locid, currdate, userid, pname, ccaddr FROM eminders JOIN dbo.USERS ON U_USERID = USERID WHERE eminders.isdeleted = 0 AND CONVERT(VARCHAR(10), futuredate, 112) = CONVERT(VARCHAR(10), getdate(), 112) AND ( senttime is NULL or YEAR(senttime) = 1900)"
            );
            if (result.rowsAffected > 0) {
                for (let i = 0; i < result.recordset.length; i++) {

                    let htmlBody = `${result.recordset[i].f_name}, <br />
                              this is the reminder you request on ${result.recordset[i].currdate}, 
                              for Customer ${result.recordset[i].cust_id}${result.recordset[i].locid ? '-'+result.recordset[i].locid : ''} ${result.recordset[i].msgtext}`;

                    let subject = `Automated Contact Reminder, [${result.recordset[i].custid}${result.recordset[i].locid ? '-'+result.recordset[i].locid : ''}]`;

                    if (!result.recordset[i].cust_id) {
                        htmlBody = `${result.recordset[i].f_name}, <br />
                              this is the reminder you request on ${result.recordset[i].currdate}, 
                              for ${result.recordset[i].pname}  ${result.recordset[i].msgtext}`

                        subject = `Automated Contact Reminder, [${result.recordset[i].pname}]`
                    }

                    let mailOptions = {
                        from: '"The Metro Group Inc." <auto-mail@metrogroupinc.com>', // sender address
                        to: result.recordset[i].emailaddr, // list of receivers                                                
                        cc: result.recordset[i].ccaddr ? result.recordset[i].ccaddr : '' , // list of copied addr's
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
                            .input('sendname', sql.VarChar, result.recordset[i].U_FNAME + ' ' + result.recordset[i].U_LNAME)
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
                            
                            let req = mainPool.request();
                            let updateOrderRecord = await req
                            .input('date', sql.DateTime, new Date())
                            .input('id_pk', sql.Int, result.recordset[i].id_pk)
                            .query(`update eminders set senttime = @date where id_pk = @id_pk `);

                            if (updateOrderRecord.rowsAffected > 0) {
                                console.log('Contact Reminder update was successful');                        
                            }
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