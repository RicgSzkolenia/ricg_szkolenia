'use strict';

/**
 * coursereport controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { v4: uuidv4 } = require('uuid');
const generateCertificatePdf = require('../../../helpers/pdfCreator');
const { sendEmailWithNodeMailer, sendCertificateMail } = require('../../../helpers/sendEmail');

module.exports = createCoreController('api::coursereport.coursereport', (({strapi}) => ({
    async create (ctx) {

        const body = ctx.request.body.data;
        const participants = body.participants;
        
        const graduates = [];
        for ( const participant of participants ) {
            let existingStudent = await strapi.query('api::student.student').findOne({ where: { email: participant.email } })
            if ( !existingStudent ) {
                existingStudent = await strapi.service('api::student.student').create({ data: {
                    name: participant.name,
                    surname: participant.surname,
                    email: participant.email,
                    publishedAt: new Date()
                }}).catch((e) => {
                    console.log('Error happended: ', e)
                })
            }


            if ( participant.status === 'COMPLETED' ) {
                const today = new Date();
                const participantString = participant.name + ' ' + participant.surname;
                const certificateBase64 = await generateCertificatePdf(participantString, 'Recruitment International Consulting Group Sp. z o.o. ', today.getDay().toString(), today.getFullYear().toString(),  body.courseName );
                const certificateId = uuidv4();
                await strapi.service('api::certificate.certificate').create({ 
                    data: {
                        uniqIdentifier: certificateId,
                        date: new Date().toISOString(),
                        status: participant.status, 
                        student: existingStudent.id,
                        course: body.courseId,
                        certificate: certificateBase64
                    }
                }).catch((e) => console.log('Error creating certificate: ', e.details, e));
               
                const context = {
                    "courseName": body.courseName, 
                    "issueYear": today.getFullYear(),
                    "issueMonth": today.getMonth(),
                    "certId": certificateId,
                    "certUrl": `https://szkolenia.ricg.eu/check/${certificateId}`
                }
                
                await sendCertificateMail(participant.email, `Certyfikat ${body.courseName}`, context, [  { filename: 'certificate.pdf', content: certificateBase64, encoding: 'base64' }]);
                console.log('Successfully sent email');
        

            }

            graduates.push(existingStudent);
        }
        
        
        // ctx.request.body.data = {...body, course: body.courseId, students: [...graduates]};
        
        // const { data, meta } = await super.create(ctx).catch((e) => {
        //     console.log('Error occured: ', e)
        // });
    }
})));
