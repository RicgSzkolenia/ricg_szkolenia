'use strict';

/**
 * webinar-participants-list controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::webinar-participants-list.webinar-participants-list', ({strapi}) => ({
    async create(ctx) {
        const body = ctx.request.body.data
        const participants = body.participants;
        const graduates = [];
       
        for ( const participant of participants ) {
            const results  = await strapi.service('api::graduate.graduate').create({ data: {
                Name: participant.name,
                Surname: participant.surname,
                email: participant.email,
                status: participant.status,
                publishedAt: new Date()
            }}).catch((e) => {
                console.log('Erreor happende: ', e)
            });
            graduates.push(results);
        }
               
        ctx.request.body.data = {...body, graduates: [...graduates]}
        const { data, meta } = await super.create(ctx);
        return { data, meta } 
    }
}));
