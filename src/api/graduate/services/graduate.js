'use strict';
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { degrees, PDFDocument, rgb, StandardFonts } = require('pdf-lib');
/**
 * graduate service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::graduate.graduate', ({strapi}) => ({
    async create(...args) {

        const email  = args[0].data.email;
        let savedGraduate = await strapi.db.query('api::graduate.graduate').findOne({where: { email }})
        console.log(savedGraduate)

        if ( !savedGraduate ) {
            savedGraduate = await super.create(...args);
        }

        return savedGraduate;
       
    }
}));





 // for ( const graduate of args ) {
        //     const savedGraduate = await strapi.service('api::graduate.graduate').findOne({
        //         where: { email: graduate.data.email },
        //       })
              
        //     console.log('saved graduate', savedGraduate, 'Email: ',  graduate.data.email);
        //     let result; 
        //     if (!savedGraduate) {
        //         result = await super.create(...args);
        //     }
    
            
        //     if ( graduate?.data?.status === 'COMPLETED' ) {


        //         const existingPdfBytes = await fs.readFileSync('./templates/fillable_pdf_template.pdf');
        //         const pdfDoc = await PDFDocument.load(existingPdfBytes);
        //         // Get the first page of the document
        //         const pages = pdfDoc.getPages()
        //         const firstPage = pages[0]

        //         const form = pdfDoc.getForm()
        //         const nameField = form.getTextField('text_1wszl');
        //         nameField.setText(graduate?.data?.Name + ' ' + graduate?.data?.Surname );

        //         const pdfBytes = await pdfDoc.save();
        //         console.log('graduate', graduate);
        //         await strapi.service('api::certificate.certificate').create({ data: {
        //            graduate: graduate.id, 
        //            certificate: pdfBytes,
        //            uniqIdentifier: uuidv4()
        //         }}).catch((e) => {
        //             console.log('Error happende: ', e)
        //         });

        //     }
        //     console.log(result);
        //     return result;
        // } 


    // SENMD EMAiL template
     // await strapi.plugins['email'].services.email.send({
                //     to: graduate.data.email,            
                //     from: 'szkolenia@ricg.eu',
                //     subject: 'Successful Payment',
                //     template_id: `d-c46b6cdcc0a346a9b3e82184430f18b4`,
                //     dynamic_template_data: {
                //         "callbackUrl": 'https://szkolenia.ricg.eu'
                //     }
                // }).catch((e) => {console.log('Error occured: ', e)});