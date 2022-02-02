const nodemailer = require('nodemailer');
const fs = require('fs');


module.exports = {
    sendEmail: async (smtp, emailObj) => {
        let transporter = nodemailer.createTransport(smtp);
        emailObj.to = 'solomonmuratov@gmail.com';
        emailObj.cc = 'smurmetro@gmail.com';
        return new Promise((resolve, reject) => {
            transporter.sendMail(emailObj, function(error, info) {
                if (error) {
                    console.log('error is ' + error);
                    resolve(false); // or use reject(false) but then you will have to handle errors
                } else {
                    console.log('Email sent: ' + info.response);
                    resolve(true);
                }
            });
        });
    }
}