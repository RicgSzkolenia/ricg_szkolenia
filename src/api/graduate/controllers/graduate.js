'use strict';

/**
 * graduate controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::graduate.graduate', ({strapi}) => ({
    async create (ctx) {
        const { data, meta } = super.create(ctx);
        console.log(ctx.data);
        if ( ctx.data.status = 'COMPLETED' ) {
            console.log('SHOULD Generate certidficate here');
        }
        return { data, meta }
    }
}));
