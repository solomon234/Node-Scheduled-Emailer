var { EmailServiceNotifications } = require('../tasks/serviceNotificationEmailer');
var { EmailContactReminder } = require('../tasks/contactReminder');
var { EmailMservice } = require('../tasks/sendMserviceEmails');
var { EmailShipmentDelayReminder } = require('../tasks/shipmentDelayedNotice');

module.exports = {
    runTask: (key, config) => {
        switch (key) {
            case 'serviceNotifications':
                EmailServiceNotifications(config);
            break;
            case 'contactReminder':
                EmailContactReminder(config);
            break;
            case 'orderAcknowledgement':
                EmailMservice('Order Acknowledgement', config);
            break;
            case 'shipmentDelay':
                EmailShipmentDelayReminder(config);
                return true
            break;
            case 'customerContact':
                EmailMservice('Customer Contact', config);
            break;        
            default:
            break;
        }
        return true;
    }
}