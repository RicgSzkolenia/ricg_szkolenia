'use strict';

/**
 * certificate service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::certificate.certificate', ({strapi}) => ({
    async create(...args) {
        console.log('Certificate Args', ...args);
        await super.create(...args);
    }
}));
