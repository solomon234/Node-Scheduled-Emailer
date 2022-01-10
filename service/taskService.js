var { EmailServiceNotifications } = require('../tasks/serviceNotificationEmailer');
var { EmailContactReminder } = require('../tasks/contactReminder');


module.exports = {
    runTask: (key, config) => {
        switch (key) {
            case 'serviceNotifications':
                EmailServiceNotifications(config)
            break;
            case 'contactReminder':
                EmailContactReminder(config)
            break;
            case 'orderAcknowledgement':
                EmailServiceNotifications(config)
            break;
            case 'shipmentDelay':
                return true
            break;
            case 'shipmentConfirmation':
                return true
            break;        
            default:
                break;
        }
        return true;
    }
}