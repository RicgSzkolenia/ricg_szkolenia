'use strict';

/**
 * target service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::target.target');
