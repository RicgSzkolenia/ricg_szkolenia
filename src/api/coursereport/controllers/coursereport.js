'use strict';

/**
 * coursereport controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { v4: uuidv4 } = require('uuid');
const generateCertificatePdf = require('../../../helpers/pdfCreator');

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
                    console.log('Erreor happende: ', e)
                })
            }
            

            if ( participant.status === 'COMPLETED' ) {
                const today = new Date();
                const participantString = participant.name + ' ' + participant.surname;
                const certificateBase64 = await generateCertificatePdf(participantString, 'Recruitment International Consulting Group Sp. z o.o. ', today.getDay().toString(), today.getFullYear().toString(),  body.courseName );
                const certificateId = uuidv4();
                const certificate = await strapi.service('api::certificate.certificate').create({ 
                    data: {
                        uniqIdentifier: certificateId,
                        date: new Date().toISOString(),
                        status: participant.status, 
                        student: existingStudent.id,
                        course: body.courseId,
                        certificate: certificateBase64
                    }
                }).catch((e) => console.log('Error creating certificate: ', e.details, e));
               
                await strapi.plugins['email'].services.email.send({
                    to: 'vs2001dor@gmail.com',            
                    from: 'szkolenia@ricg.eu',
                    subject: 'Successful course Completion',
                    template_id: `d-5fb33423e80f4a9c97024aeb4971fabb`,
                    dynamic_template_data: {
                        "courseName": body.courseName, 
                        "issueYear": today.getFullYear(),
                        "issueMonth": today.getMonth(),
                        "certId": certificateId,
                        "certUrl": `https://szkolenia.ricg.eu/certificate/${certificateId}`
                    },
                    attachments: [
                        {
                            filename: 'certificate.pdf',
                            content: certificateBase64
                        }
                    ]
                    });

            }

            graduates.push(existingStudent);
        }
        
        ctx.request.body.data = {...body, students: [...graduates]}

        const { data, meta } = await super.create(ctx).catch((e) => {
            console.log('Error occured: ', e)
        });
        return { data, meta } 
    }
})));
