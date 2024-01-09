const hbs = require('nodemailer-express-handlebars')
const nodemailer = require('nodemailer')
const path = require('path')

const createHandleBarsOptions = () => {
    const handlebarOptions = {
        viewEngine: {
            partialsDir: path.resolve('./src/helpers/emailtemplates/'),
            defaultLayout: false,
        },
        viewPath: path.resolve('./src/helpers/emailtemplates/'),
    };

    return handlebarOptions;
}

const createMailOptions = (recipientEmail, subject, template, context, attachments) => {
    
    return {
        from: process.env.SENDER_EMAIL,
        template,
        to: recipientEmail,
        subject,
        context,
        attachments: [...attachments]
    }
}

const createTransporter = () => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMPT_SERVER,
        port: 465,
        secure: true,
        logger: true, 
        secureConnection: false,
        auth: {
            user: process.env.SENDER_EMAIL,
            pass:  process.env.SENDER_PASSWORD
            }
        });
    return transporter;
}

async function sendEmail (email, webinarLink) {
    try{

        return await strapi.plugins['email'].services.email.send({
            to: email,            
            name: 'Paulina Szkoli',
            from: 'szkolenia@ricg.eu',
            subject: 'Successful Payment',
            template_id: `d-c46b6cdcc0a346a9b3e82184430f18b4`,
            dynamic_template_data: {
                "callbackurls": webinarLink
            }
        });
    } catch(err) {
        console.error(err);
    }

}

const sendEmailWithNodeMailer = async (recipientEmail, subject, body) => {
    
    const transporter = createTransporter();
    const mailOptions = createMailOptions(recipientEmail, subject, 'testEmail', {  name: 'Vsevolod',
        company: 'my company' });
    const handlebarsOptions = createHandleBarsOptions();
    transporter.use('compile', hbs(handlebarsOptions))
    const info = await transporter.sendMail(mailOptions);
    console.log(info.response, info.rejected, info.accepted);

   
}


const sendCertificateMail = async (recipientEmail, subject, context, attachments) => {
 
    const transporter = createTransporter();
    const mailOptions = createMailOptions(recipientEmail, subject, 'certificateEmail', context, attachments);
    const handlebarsOptions = createHandleBarsOptions();
    transporter.use('compile', hbs(handlebarsOptions))
    const info = await transporter.sendMail(mailOptions);
    console.log(info.response, info.rejected, info.accepted);
}

const sendPaymentConfiramtionMail = async (recipientEmail, subject, context) => {
 
    const transporter = createTransporter();
    const mailOptions = createMailOptions(recipientEmail, subject, 'confirmationEmail', context, []);
    const handlebarsOptions = createHandleBarsOptions();
    transporter.use('compile', hbs(handlebarsOptions))
    const info = await transporter.sendMail(mailOptions);
    console.log(info.response, info.rejected, info.accepted);
}

const sendNotificationEmail = async (recipientEmail, subject, context) => {
    const transporter = createTransporter();
    const mailOptions = createMailOptions(recipientEmail, subject, 'notificationEmail', context, []);
    const handlebarsOptions = createHandleBarsOptions();
    transporter.use('compile', hbs(handlebarsOptions));
    const info = await transporter.sendMail(mailOptions);
    console.log(info.response, info.rejected, info.accepted);
}

module.exports = { 
    sendEmail, 
    sendEmailWithNodeMailer,
    sendPaymentConfiramtionMail,
    sendCertificateMail,
    sendNotificationEmail
}