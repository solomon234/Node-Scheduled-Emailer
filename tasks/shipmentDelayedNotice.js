const { sendEmail } = require('../service/emailService');
const sql = require('mssql');
const fs = require('fs');
var momentBusinessDays = require("moment-business-days")

var ShipmentDelayedTask = {
    EmailShipmentDelayReminder: async (config) => {

        let mainPool = new sql.ConnectionPool(config.test.active ? config.test : config.prod);
        let mainPoolConnect = mainPool.connect();

        await mainPoolConnect; //checks if pool is connected
        try {
            console.log('Connection Established');
            let req = mainPool.request();
            let result = await req.query(
                `SELECT top 10 mrsls.F_NAME + ' ' + mrsls.L_NAME name
                ,dbo.MRORDH.*
                ,mrloc.adr1 locname
                ,shipalert AS maxfactor
                ,emails.email
            FROM MRORDH
                JOIN
                (
                    SELECT ORDER_NO,
                           SUM(ITEMHEDR.SHIPALERT) shipalert
                    FROM MRORDD,
                         ITEMHEDR
                    WHERE MRORDD.IsDeleted = 0
                          AND ITEMHEDR.IsDeleted = 0
                          AND MRORDD.ITEM_NO = ITEMHEDR.ITEMCODE
                    GROUP BY ORDER_NO
                ) shipalerts
                    ON shipalerts.ORDER_NO = MRORDH.ORDER_NO
                JOIN mrsls ON mrsls.SLS_ID = mrordh.SLS_REP_1 AND MRSLS.IsDeleted = 0
                JOIN mrloc ON mrloc.CUST_ID = dbo.MRORDH.CUST_ID AND mrloc.LOC_ID = dbo.MRORDH.LOC_ID AND mrloc.IsDeleted = 0
                CROSS JOIN (SELECT EMAIL FROM  dbo.MRMAILSEND WHERE SUBJECT = 'Shipment Delayed Notice - Email' AND IsDeleted = 0) emails
            WHERE MRORDH.IsDeleted = 0
                  AND CONVERT(VARCHAR(10), ORDER_DT, 112) <> CONVERT(VARCHAR(10), GETDATE(), 112)
                  AND
                  (
                      YEAR(WARNMSG_DT) = 1900
                      OR WARNMSG_DT IS NULL
                  )
                  AND shipalerts.shipalert <> 0
            ORDER BY ORDER_DT,
                     ORDER_NO;
            
         `);
            if (result.rowsAffected > 0) {
                for (let i = 0; i < result.recordset.length; i++) {
                    
                    let endDate = momentBusinessDays(result.recordset[i].ORDER_DT, 'MM/DD/YYYY').businessAdd(result.recordset[i].maxfactor)._d;

                    let htmlBody = `From: MetroLink Auto-Mail <br />
                              Server To: ${result.recordset[i].name} <br />
                              Subject: Shipment Delay <br />
                              Copy Customer: ${result.recordset[i].CUST_ID},${result.recordset[i].LOC_ID} <br />
                              Location: ${result.recordset[i].LOC_ID},${result.recordset[i].locname} <br />
                              Order #: ${result.recordset[i].ORDER_NO} <br />
                              This message is to notify you that one or more order items have not yet shipped or are still in the process of being invoiced.  <br />
                              Please note that the Order was entered on ${result.recordset[i].ORDER_DT.toLocaleDateString()} and had been scheduled to ship by ${endDate.toLocaleDateString()}.  <br />
                              Please contact your Order Processor for updated shipping information. Additional details regarding this Order are available for your review on MetroLink.`;

                    let mailOptions = {
                        from: '"The Metro Group Inc." <auto-mail@metrogroupinc.com>', // sender address
                        to: result.recordset[i].email, // list of receivers                        
                        // to: 'solomonmuratov@gmail.com',
                        subject: `Shipment Delayed Notice`, // Subject line
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
                            .input('sendname', sql.VarChar, result.recordset[i].name)
                            .input('emailaddr', sql.VarChar, result.recordset[i].email)
                            .input('ccaddr', sql.VarChar, '')
                            .input('msgtext', sql.VarChar, htmlBody)
                            .input('msubject', sql.VarChar,`Shipment Delayed Notice`)                                                  
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
                            .input('id_pk', sql.Int, result.recordset[i].Id_pk)
                            .query(`update MRORDH set WARNMSG_DT = @date where id_pk = @id_pk `);

                            if (updateOrderRecord.rowsAffected > 0) {
                                console.log('Order update was succesful');                        
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
module.exports = ShipmentDelayedTask;