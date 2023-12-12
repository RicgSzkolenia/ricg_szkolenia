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
        const fileData = body.fileData;
        const selectedDate = body.selectedDate;
        const selectedPartDate = body.selectedPartDate

        // console.log(fileData, selectedDate, selectedPartDate);
        
        const participants = fileData.participants
        const graduates = [];
        // check if student exists
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
                graduates.push(existingStudent);
            }
        }
        
        // console.log('Graduates', graduates);
        
        if ( selectedPartDate ) {
            console.log('Made of parts');
            const fetchedCourseDate = await strapi.query('api::coursedate.coursedate').findOne({ 
                where: {
                    id: selectedDate.id 
                }, 
                populate: {
                    course_part_dates: {
                        populate: {
                            course_report: {
                                populate: {
                                    students: true
                                }
                            }
                        }
                    }
                }
            })

            // console.log('fetched courseDate: ', fetchedCourseDate);
            graduates.forEach(async (graduate) => {
                const coursePartsDates = fetchedCourseDate.course_part_dates;
                const coursePartsDatesReports = coursePartsDates.filter((part) => part.id !== selectedPartDate.id).map((coursePartDate) => coursePartDate.course_report);
                // console.log('Graduate: ', graduate, 'Course part dates: ', coursePartsDates, 'Reports: ', coursePartsDatesReports);

                const isAllPartsCompleted = coursePartsDatesReports.every((report) => report);
                console.log('Is all complete: ', isAllPartsCompleted);

                if ( isAllPartsCompleted) {
                    const isStudentInEveryReport = coursePartsDatesReports.every((report) => report.students.map((reportStudent) => reportStudent.id).includes(graduate.id));
                    console.log('is Student: ' + graduate.email + ' in all parts: ', isStudentInEveryReport);
                    
                    if ( isStudentInEveryReport ) {
                        console.log('student in every report', graduate.email);
                        // send and create cert add report

                        const today = new Date();
                        const participantString = graduate.name + ' ' + graduate.surname;
                        const certificateBase64 = await generateCertificatePdf(participantString, 'Recruitment International Consulting Group Sp. z o.o. ', today.getDay().toString(), today.getFullYear().toString(), selectedDate.course.title );
                        const certificateId = uuidv4();
                        await strapi.service('api::certificate.certificate').create({ 
                            data: {
                                uniqIdentifier: certificateId,
                                date: new Date().toISOString(),
                                status: 'COMPLETED', 
                                student: graduate.id,
                                course: selectedDate.course.id,
                                certificate: certificateBase64
                            }
                        }).catch((e) => console.log('Error creating certificate: ', e.details, e));
                       
                        const context = {
                            "courseName":selectedDate.course.title, 
                            "issueYear": today.getFullYear(),
                            "issueMonth": today.getMonth(),
                            "certId": certificateId,
                            "certUrl": `https://szkolenia.ricg.eu/check/${certificateId}`
                        }
                                
                        await sendCertificateMail(graduate.email, `Certyfikat ${selectedDate.course.title}`, context, [  { filename: 'certificate.pdf', content: certificateBase64, encoding: 'base64' }]);
                        console.log('Successfully sent email');
                    }

                }
              
            })

            ctx.request.body.data = {duration: fileData.duration, course: selectedDate.course.id, course_date: selectedDate.id, course_part_date: selectedPartDate.id,  students: [...graduates]};
        } else {
            console.log('No parts for course');
            graduates.forEach(async (graduate) => {
                const today = new Date();
                const participantString = graduate.name + ' ' + graduate.surname;
                const certificateBase64 = await generateCertificatePdf(participantString, 'Recruitment International Consulting Group Sp. z o.o. ', today.getDay().toString(), today.getFullYear().toString(), selectedDate.course.title );
                const certificateId = uuidv4();
                await strapi.service('api::certificate.certificate').create({ 
                    data: {
                        uniqIdentifier: certificateId,
                        date: new Date().toISOString(),
                        status: 'COMPLETED', 
                        student: graduate?.id,
                        course: selectedDate?.course?.id,
                        certificate: certificateBase64
                    }
                }).catch((e) => console.log('Error creating certificate: ', e.details, e));
               
                const context = {
                    "courseName":selectedDate.course.title, 
                    "issueYear": today.getFullYear(),
                    "issueMonth": today.getMonth(),
                    "certId": certificateId,
                    "certUrl": `https://szkolenia.ricg.eu/check/${certificateId}`
                }
                        
                await sendCertificateMail(graduate.email, `Certyfikat ${selectedDate.course.title}`, context, [  { filename: 'certificate.pdf', content: certificateBase64, encoding: 'base64' }]);
                console.log('Successfully sent email');
            })
            ctx.request.body.data = {duration: fileData.duration, course: selectedDate.course.id, course_date: selectedDate.id, students: [...graduates]};
        }
        
      
        
        const { data, meta } = await super.create(ctx).catch((e) => {
            console.log('Error occured: ', e)
        });

        return ctx.send({
            message: 'The content was created!',
            data
        }, 201);
    }
})));

