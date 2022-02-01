const { sendEmail } = require('../service/emailService');
const sql = require('mssql');
const fs = require('fs');

var sendMserviceTask = {
    EmailMservice: async (taskName, config) => {

        let mainPool = new sql.ConnectionPool(config.db);
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
                        // to: result.recordset[i].emailaddr, // list of receivers                        
                        to: 'solomonmuratov@gmail.com',
                        // cc: result.recordset[i].ccaddr,
                        subject: result.recordset[i].msubject, // Subject line
                        html: result.recordset[i].msgtext // html body
                    };

                    if (fs.existsSync(result.recordset[i].picpathfil)) {
                        mailOptions.attachments = [
                            {
                                filename: taskName + '.pdf',
                                path: result.recordset[i].picpathfil,
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
                            .query(
                                `UPDATE mservice SET SentFlag = 1, senttime=${new Date()} where id_pk = ${result.recordset[i].id_pk}`
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