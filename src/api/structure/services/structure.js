'use strict';

/**
 * structure service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::structure.structure');
