module.exports = async function sendEmail (email, webinarLink) {
    try{

        return await strapi.plugins['email'].services.email.send({
            to: email,            
            from: 'szkolenia@ricg.eu',
            subject: 'Successful Payment',
            template_id: `d-c46b6cdcc0a346a9b3e82184430f18b4`,
            dynamic_template_data: {
                "callbackUrl": webinarLink || 'https://szkolenia.ricg.eu'
            }
        });
    } catch(err) {
        console.error(err);
    }

}