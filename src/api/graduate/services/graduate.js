'use strict';

/**
 * graduate service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::graduate.graduate');
