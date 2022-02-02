const { sendEmail } = require('../service/emailService');
const sql = require('mssql');
const fs = require('fs');

var sendMserviceTask = {
    EmailMservice: async (taskName, config) => {

        let mainPool = new sql.ConnectionPool(config.test.active ? config.test : config.prod);
        let mainPoolConnect = mainPool.connect();


        await mainPoolConnect; //checks if pool is connected
        try {
            console.log('Connection Established');
            let req = mainPool.request();
            let result = await req.query(
                 `SELECT top 1 * FROM mservice WHERE MSUBJECT LIKE '${taskName}%' AND SENTFLAG = 0 AND IsDeleted = 0`                
            );
            if (result.rowsAffected > 0) {
                for (let i = 0; i < result.recordset.length; i++) {

                    let mailOptions = {
                        from: '"The Metro Group Inc." <auto-mail@metrogroupinc.com>', // sender address
                        to: result.recordset[i].EMAILADDR, // list of receivers                        
                        cc: result.recordset[i].CCADDR,
                        subject: result.recordset[i].MSUBJECT, // Subject line
                        html: result.recordset[i].MSGTEXT // html body
                    };

                    if (fs.existsSync(result.recordset[i].PICPATHFIL)) {
                        mailOptions.attachments = [
                            {
                                filename: taskName + '.pdf',
                                path: result.recordset[i].PICPATHFIL,
                                contentType: 'application/pdf'
                            }
                        ];
                    }

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
                            .input('date', sql.DateTime, new Date())
                            .input('id_pk', sql.Int, result.recordset[i].Id_pk)                         
                            .query(
                                `UPDATE mservice SET SentFlag = 1, senttime = @date where id_pk = @id_pk`
                            );
                        if (insertResponse.rowsAffected > 0) {
                            console.log('MSERVICE was updated succesfully');                        
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
module.exports = sendMserviceTask;