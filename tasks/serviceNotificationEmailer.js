const sql = require('mssql');
const fs = require('fs');
const { sendEmail } = require('../service/emailService');


var serviceNotificationTask = {
    EmailServiceNotifications: async (config) => {

        let mainPool = new sql.ConnectionPool(config.test.active ? config.test : config.prod);
        let mainPoolConnect = mainPool.connect();        

        await mainPoolConnect; //checks if pool is connected
        try {
            console.log('Connection Established');
            let req = mainPool.request();
            let result = await req.query(
                "Select top 25 mrwohst.id_pk, mrwohst.cust_id, mrwohst.loc_id, mrwohst.sys_id,SYS_TP_DSC, mrsls.sls_id, isnull(mrsls.f_name+' '+mrsls.l_name, '') as salesperson,isnull(mrsls.e_mail_adr, '') as e_mail_adr,mrsls.phone_no, svc_date, conf_date, rc_number, ifileloc, noemail, mrcust.atn, mrcust.[name], enotify, mrloc.name as loc_Name,mrloc.adr1,mrloc.city, mrloc.[state], mrloc.zip From mrwohst left join mrcust on mrwohst.cust_id = mrcust.CUST_ID and mrcust.IsDeleted = 0 left join mrloc on mrloc.cust_id + mrloc.loc_id = mrwohst.cust_id + mrwohst.loc_id and mrloc.isdeleted = 0 inner join mremails email1 on MRWOHST.cust_id = email1.CUST_ID and email1.IsDeleted = 0 and email1.service_report = 1 left join mrsls on mrsls.SLS_ID = mrloc.sls_rep_1 and mrsls.isdeleted = 0 left join mrsys on mrwohst.CUST_ID+mrwohst.LOC_ID+MRWOHST.SYS_ID = mrsys.CUST_ID+mrsys.LOC_ID+mrsys.SYS_ID and mrsys.IsDeleted = 0 left join mrsystp on mrsystp.SYS_TYPE = mrsys.SYS_TYPE and mrsystp.IsDeleted = 0 WHERE mrwohst.IsDeleted=0 And Status='1' And (ISNULL(email_date,'')=''  or year(email_date) = 1900) And conf_date>=GetDate()-30  group by mrwohst.id_pk, mrwohst.cust_id, mrwohst.loc_id, mrwohst.sys_id,SYS_TP_DSC, mrsls.sls_id, mrsls.f_name+' '+mrsls.l_name,mrsls.e_mail_adr,mrsls.phone_no, svc_date, conf_date, rc_number, ifileloc, noemail, mrcust.atn, mrcust.[name], enotify, mrloc.name,mrloc.adr1,mrloc.city, mrloc.[state], mrloc.zip order by MRWOHST.Id_pk"
            );
            if (result.rowsAffected > 0) {
                for (let i = 0; i < result.recordset.length; i++) {
                    console.log(result.recordset[i].cust_id, result.recordset[i].loc_id);
                    let req = mainPool.request();
                    let emailsResult = await req.query(
                        `select stuff((SELECT distinct ', ' + email FROM mremails email2 where ((email1.CUST_ID = email2.CUST_ID and isnull(email2.LOC_ID,'') = '' or email1.cust_id = email2.CUST_ID and isnull(email1.loc_id,'') = email2.loc_id) and email2.service_report = 1 and email2.IsDeleted = 0) FOR XML PATH('')),1,1,'') as email from mremails email1 where (cust_id ='${result
                            .recordset[i].cust_id}' and loc_id = '${result.recordset[i].loc_id}')`
                    );
                    if (emailsResult.rowsAffected > 0) {
                        console.log(emailsResult.recordset[0].email);

                        let file = `\\\\metro-nyc-web\\${result.recordset[i].cust_id.substring(3, 4) == 'B'
                            ? 'wohistory'
                            : 'routecards'}${result.recordset[i].ifileloc}`;

                        if (file.includes('norc.tif')) {
                            file = '';
                        }

                        if (!fs.existsSync(file)) {
                            file = '';
                        }
                        let htmlAttachmentMsg = '';

                        if (file != '') {
                            htmlAttachmentMsg = `Attached, Please find a copy of your service report <br /><br />`;
                        }

                        htmlAttachmentMsg += `If you have any questions about this service visit, please feel free to contact me directly.<br /><br />`;

                        let htmlBody = `From: The Metro Group Inc. ${result.recordset[i].cust_id.substring(3, 1) == 'B'
                            ? '- Water Chemicals Division'
                            : ''} <br />
                              Customer: ${result.recordset[i].name}<br />
                              Reference ID: ${result.recordset[i].cust_id +
                            '-' +
                            result.recordset[i].loc_id +
                            '-' +
                            result.recordset[i].sys_id +
                            '-' +
                            result.recordset[i].rc_number}<br /><br />
                              On ${result.recordset[i].svc_date.toLocaleDateString("en-US")} our service technician performed water treatment services at
                              ${result.recordset[i].adr1 +
                            ' ' +
                            result.recordset[i].city +
                            ', ' +
                            result.recordset[i].state +
                            ' ' +
                            result.recordset[i].zip} <br /><br />
                              System ${result.recordset[i].sys_id}, ${result.recordset[i].SYS_TP_DSC}<br /><br />
                              ${htmlAttachmentMsg}
                              Sincerely,<br />
                              ${result.recordset[i].salesperson} <br />
                              Account Manager <br />
                              ${result.recordset[i].e_mail_adr}<br />
                              ${result.recordset[i].phone_no ? 'Tel: ' + result.recordset[i].phone_no : ''}
                              `;

                        let mailOptions = {
                            from: '"The Metro Group Inc." <auto-mail@metrogroupinc.com>', // sender address
                            to: emailsResult.recordset[0].email, // list of receivers
                            replyTo: result.recordset[i].e_mail_adr,
                            //to: 'smuratov@metrogroupinc.com',
                            subject: `Automated Service Notification [${result.recordset[i].cust_id}-${result.recordset[i]
                                .loc_id}]`, // Subject line
                            cc: '',
                            //cc: '',
                            html: htmlBody // html body
                        };

                        if (file != '') {
                            console.log('File Exists');
                            if (file.includes('.pdf')) {
                                mailOptions.attachments = [
                                    {
                                        filename: 'Service Report.pdf',
                                        path: file,
                                        contentType: 'application/pdf'
                                    }
                                ];
                            }
                            else {
                                mailOptions.attachments = [
                                    {
                                        filename: 'Service Report.tif',
                                        path: file,
                                        contentType: 'image/tiff'
                                    }
                                ];
                            }
                        }

                        let today = new Date();
                        let dd = today.getDate();
                        let mm = today.getMonth() + 1;
                        let yyyy = today.getFullYear();

                        sendmail = async () => {
                            let resp = await sendEmail(config.smtp,mailOptions);
                            return resp;
                        };

                        let sendMailResp = await sendmail();
                        if (sendMailResp) {
                            let req = mainPool.request();
                            let insertResponse = await req
                                .input('sendname', sql.VarChar, 'Building / Property Manger')
                                .input('emailaddr', sql.VarChar, result.recordset[i].e_mail_adr)
                                .input('ccaddr', sql.VarChar, result.recordset[i].e_mail_adr)
                                .input('msgtext', sql.VarChar, htmlBody)
                                .input(
                                    'msubject',
                                    sql.VarChar,
                                    `Automated Service Notification [${result.recordset[i].cust_id}-${result.recordset[i]
                                        .loc_id}]`
                                )
                                .input(
                                    'imgpathfil',
                                    sql.VarChar,
                                    !result.recordset[i].ifileloc.includes('norc.tif') ? result.recordset[i].ifileloc : ''
                                )
                                .input('sentflag', sql.Bit, 1)
                                .input('senttime', sql.DateTime, new Date())
                                .input('cstamp', sql.VarChar, `AUTOSERV${yyyy}${mm}${dd}`)
                                .query(
                                    'INSERT INTO mservice (sendname, emailaddr, ccaddr, msgtext, msubject,imgpathfil,sentflag,senttime,cstamp) VALUES (@sendname, @emailaddr, @ccaddr, @msgtext, @msubject,@imgpathfil,@sentflag,@senttime,@cstamp)'
                                );
                            if (insertResponse.rowsAffected > 0) {
                                console.log('MSERVICE was added succesfully');
                                let updateMrwohst = await req
                                    .input('date', sql.DateTime, new Date())
                                    .query(
                                        `UPDATE mrwohst SET email_date = @date where id_pk = '${result.recordset[i].id_pk}'`
                                    );
                                if (updateMrwohst.rowsAffected > 0) {
                                    console.log('Work Order History Updated');
                                }
                            }
                        } else {
                            //Set email date even if not sent to avoid top 50 from hanging up on all non-sent emails. 
                            console.log('Service Email Not Set - Nothing Sent');
                            let req = mainPool.request();
                            let updateMrwohst = await req
                                .input('date', sql.DateTime, new Date())
                                .query(
                                    `UPDATE mrwohst SET email_date = @date, updstamp='NOTSENT' where id_pk = '${result.recordset[i].id_pk}'`
                                );
                            if (updateMrwohst.rowsAffected > 0) {
                                console.log('Work Order History Updated');
                            }
                        }
                    } else {
                        // console.log(emailsResult);
                        //Set email date even if not sent to avoid top 50 from hanging up on all non-sent emails. 
                        console.log('Service Email Not Set - Nothing Sent');
                        let req = mainPool.request();
                        let updateMrwohst = await req
                            .input('date', sql.DateTime, new Date())
                            .query(
                                `UPDATE mrwohst SET email_date = @date, updstamp='NOTSENT' where id_pk = '${result.recordset[i].id_pk}'`
                            );
                        if (updateMrwohst.rowsAffected > 0) {
                            console.log('Work Order History Updated');
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
module.exports = serviceNotificationTask;