'use strict';

/**
 * author router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::author.author', ({strapi})=> ({
    async getAuthorByCourseId (ctx) {

    }
}));
