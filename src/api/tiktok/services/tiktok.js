'use strict';

/**
 * tiktok service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::tiktok.tiktok');
