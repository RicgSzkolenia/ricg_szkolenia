'use strict';

/**
 * certificate controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::certificate.certificate',  ({ strapi }) => ({
    async findByUniqueId(ctx) {
      const certId = ctx.params.id;
      const cert = await strapi.db.query("api::certificate.certificate").findOne({ where: {
        uniqIdentifier: certId
      }});

      return ctx.response.send({ cert })
    },
}));
