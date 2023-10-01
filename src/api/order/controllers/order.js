'use strict';

/**
 * order controller
 */

const stripe = require('stripe')(process.env.STRIPE_KEY);

const unparsed = require('koa-body/unparsed.js');
const sendEmail = require('../../../helpers/sendEmail');
const { createCoreController } = require('@strapi/strapi').factories;


module.exports = createCoreController('api::order.order', ({strapi})=> ({
    async create(ctx) {
        const { products } = ctx.request.body;
        
        const lineItems = await Promise.all(
            products.map( async (item) => {
                const foundItem =  await strapi.service("api::course.course").findOne(item.course.id);
                return {
                    price_data: {
                        currency: "pln",
                        product_data: {
                            name: foundItem.Title,
                            description: foundItem.shortDescription,
                            metadata: {
                                id: foundItem.id,
                                date: item.date.value
                            }
                        },
                        unit_amount: Math.round((foundItem.redeemedPrice ?? foundItem.Price) * 100),
                    },
                    quantity: item.quantity,
                  };
            }))

        try {
            const session = await stripe.checkout.sessions.create({
                mode: "payment",
                success_url: process.env.CLIENT_FRONT_URL || '',
                cancel_url: process.env.CLIENT_FRONT_URL || '',
                line_items: lineItems,
                payment_method_types: ["card", "blik", "p24"],
                allow_promotion_codes: true,
                invoice_creation: {
                    enabled: true,
                },
                tax_id_collection: {
                    enabled: true,
                }
            })

            return { stripeSession: session }
        } catch (err) {
            console.log(err);
            ctx.response.status = 500;
            return err;
        }
    },

    async aftertransaction (ctx) {
        const payload = ctx.request.body[Symbol.for("unparsedBody")];
        const signature = ctx.request.headers['stripe-signature'];
        let event;

        try {
          event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
          switch (event.type) {
            case 'checkout.session.completed': {

                const sessionWithLineItems = await stripe.checkout.sessions.retrieve(
                    event.data.object.id,
                    {
                      expand: ['line_items'],
                    }
                  );
                const lineItems = sessionWithLineItems.line_items;

                const callbackurls = [];
                const boughtWebinarDateIds = [];
                const boughtItems = await Promise.all(lineItems.data?.map(async (item) => {
                    const product = await stripe.products.retrieve(item.price.product);
                    const date = await strapi.service("api::coursedate.coursedate").findOne(product.metadata.date)
                    callbackurls.push({ name: product.name, date: date.date, link: date.webinarLink});
                    boughtWebinarDateIds.push(date.id)
                    return {productId: product.metadata.id, date: date.date, productTitle: product.name, quantity: item.quantity };
                }))

                // if session is paid
                if (event.data.object.payment_status === 'paid') { 
                    const customerMail = event.data.object.customer_details.email;
                    console.log('EVENT +-+: ', event);
                    await strapi.service("api::order.order").create({ data: { paymentStatus: 'Paid', rawProducts: boughtItems, paymentId: event.data.object.payment_intent, course_dates: boughtWebinarDateIds, email: customerMail, } });

                    await sendEmail(customerMail, callbackurls)
                }

                console.log('Competed successfully', callbackurls);

                return ctx.send({
                    message: 'The content was created!'
                }, 201);
            }

            case 'payment_intent.payment_failed': {
                return ctx.send({
                    message: 'Paymnet failed'
                }, 500);
            }

          }

        } catch (err) {
            console.log('Errr:', err);
          return ctx.response.send(`Webhook Error: ${err.message}`);
        }
    }
}));
