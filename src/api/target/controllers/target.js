'use strict';

/**
 * target controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::target.target');
