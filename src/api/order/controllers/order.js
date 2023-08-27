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
            products.map( async (item) => {
                const foundItem =  await strapi.service("api::course.course").findOne(item.course.id)
                lineItemsIds.push(item.id);
                return {
                    price_data: {
                        currency: "pln",
                        product_data: {
                            name: foundItem.Title,
                            description: 'Some description',
                            metadata: {
                                'test' : 'anotherone'
                            }
                        },
                        unit_amount: Math.round(foundItem.Price * 100),
                    },
                    quantity: 1,
                  };
            })
        )

        console.log('Line items: ', lineItems);

        try {
            const session = await stripe.checkout.sessions.create({
                mode: "payment",
                success_url: `http://localhost:3000?success=true`,
                cancel_url: `${process.env.CLIENT_URL}?canceled=true`,
                line_items: lineItems,
                shipping_address_collection: { allowed_countries: ['PL'] },
                payment_method_types: ["card", "blik"],
                invoice_creation: {
                    enabled: true,
                },
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
          event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
          switch (event.type) {
            case 'checkout.session.completed': {
                console.log('HERE started');
                const session = event.data.object;
                const customerMail = session.customer_details.email;
                // if session is paid
                if (session.payment_status === 'paid') { 
                    // retirving bought objects:
                    const coursesIds = session.metadata.lineItemIds.split(',');
                    const coursesBought = await Promise.all(
                        coursesIds.map( async (courseId) => {
                            const item =  await strapi.service("api::course.course").findOne(courseId)
                            return item;
                        })
                    )

                    // creating new order:
                    await strapi
                    .service("api::order.order")
                    .create({ data: { paymentStatus: 'Paid', products: coursesBought, paymentId: session.id, email: customerMail } });

                    try{
                        const links = await strapi.service("api::link.link").findOne(1);
                        const link = links?.link
                        console.log('Link', links.link, link);
                        await strapi.plugins['email'].services.email.send({
                            to: customerMail,            
                            from: 'szkolenia@ricg.eu',
                            subject: 'Successful Payment',
                            template_id: `d-c46b6cdcc0a346a9b3e82184430f18b4`,
                            dynamic_template_data: {
                                "callbackUrl": link || 'https://szkolenia.ricg.eu'
                            }
                            });
                    } catch(err) {
                        console.error(err);
                    }
            



                    return ctx.send({
                        message: 'The content was created!'
                    }, 201);
                }
                break;
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
