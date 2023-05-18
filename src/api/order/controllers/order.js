'use strict';

/**
 * order controller
 */

const stripe = require('stripe')(process.env.STRIPE_KEY);

const unparsed = require('koa-body/unparsed.js');
const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::order.order', ({strapi})=> ({
    async create(ctx) {
        const { products } = ctx.request.body;
        const lineItemsIds = [];
        const lineItems = await Promise.all(
            products.map( async (product) => {
                const item =  await strapi.service("api::course.course").findOne(product.id)
                lineItemsIds.push(item.id);
                return {
                    price_data: {
                        currency: "pln",
                        product_data: {
                            name: item.Title,
                        },
                        unit_amount: Math.round(item.Price * 100),
                    },
                    quantity: 1,
                  };
            })
        )

        try {
            const session = await stripe.checkout.sessions.create({
                mode: "payment",
                success_url: `${process.env.CLIENT_URL}?success=true`,
                cancel_url: `${process.env.CLIENT_URL}?canceled=true`,
                line_items: lineItems,
                shipping_address_collection: { allowed_countries: ['PL'] },
                payment_method_types: ["card", "blik"],
                metadata: {
                    lineItemIds: lineItemsIds.toString()
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
          event = stripe.webhooks.constructEvent(payload, signature, 'whsec_a1c166ff291fc5e65cad0f0e35e4d3ed7064e14095039a12990b166d3a39f162');
          console.log('EVENT types:', event.type, event.data.items?.data);
          switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const customerMail = session.customer_details.email;
                // if session is paid
                if (session.payment_status === 'paid') { 

                    // retirving bought objects: 
                    const coursesIds = session.metadata.lineItemIds.split(',');
                    const coursesBought = await Promise.all(
                        coursesIds.map( async (courseId) => {
                            const item =  await strapi.service("api::course.course").findOne(courseId)
                            console.log(item);
                            return item;
                        })
                    )

                    // creating new order:
                    await strapi
                    .service("api::order.order")
                    .create({ data: { paymentStatus: 'Paid', products: coursesBought, paymentId: session.id, email: customerMail } });


                    // sending user link via email: 
                    await strapi.plugins['email'].services.email.send({
                        to: customerMail,
                        from: process.env.SINGLE_AUTHORIZED_SENDER, // e.g. single sender verification in SendGrid
                        subject: 'Paid successfully!!!',
                        html: '<p>Here is your link to zoom webinar: </p>',
                      })
                }
                break;
            }

          }

        } catch (err) {
            console.log('Errr:', err);
          return ctx.response.send(`Webhook Error: ${err.message}`);
        }
    }
}));





// const order = await strapi.db.query("api::order.order").findOne({ where: { paymentId: session.id } });

                    // await strapi.db.query('api::order.order').update({
                    //     where: { id: order.id },
                    //     data: {
                    //         ...order, 
                    //         email: customerMail,
                    //         paymentStatus: 'Paid'
                    //     },
                    //   });