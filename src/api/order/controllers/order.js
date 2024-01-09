'use strict';

/**
 * order controller
 */

const stripe = require('stripe')(process.env.STRIPE_KEY);

const unparsed = require('koa-body/unparsed.js');
const { sendPaymentConfiramtionMail, sendNotificationEmail } = require('../../../helpers/sendEmail');
const { createCoreController } = require('@strapi/strapi').factories;


module.exports = createCoreController('api::order.order', ({strapi})=> ({
    async create(ctx) {
        const { products } = ctx.request.body;
        
        const lineItems = await Promise.all(
            products.map( async (item) => {
                const foundItem =  await strapi.service("api::course.course").findOne(item.course.id);
                const taxRate = await stripe.taxRates.create({
                    display_name: 'EU VAT',
                    inclusive: false,
                    percentage: 23,
                    country: 'PL',
                    jurisdiction: 'PL',
                    description: 'EU VAT 23%',
                  });

                  console.log(taxRate);

                return {
                    price_data: {
                        currency: "pln",
                        product_data: {
                            name: 'Webinar ' + foundItem.Title,
                            description: foundItem.shortDescription,
                            metadata: {
                                id: foundItem.id,
                                date: item.date.value
                            }
                        },
                        unit_amount: Math.round((foundItem.redeemedPrice ?? foundItem.Price) * 100),
                    },
                    tax_rates: [taxRate.id],
                    quantity: item.quantity,
                  };
            }))

        try {
            

            const session = await stripe.checkout.sessions.create({
                mode: "payment",
                success_url: `${process.env.CLIENT_FRONT_URL}/status/payment?success=true` || '',
                cancel_url: `${process.env.CLIENT_FRONT_URL}/status/payment?success=false` || '',
                invoice_creation: {
                    enabled: true,
                },
                line_items: lineItems,
                payment_method_types: ["card", "blik", "p24"],
                allow_promotion_codes: true,
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
                    const date = await strapi.query('api::coursedate.coursedate').findOne({ 
                        where: {
                            id: product.metadata.date
                        }, 
                        populate: {
                            course_parts: true,
                            course_part_dates: {
                                populate: {
                                    course_parts: true
                                }
                            }
                        }
                    });

                    if ( date?.course_part_dates && date?.course_part_dates?.length > 0 ) {
                        date?.course_part_dates.forEach((coursePartDate) => {
                            console.log(coursePartDate, ' Name: ', coursePartDate?.course_parts?.[0]?.header, ' Date: ', coursePartDate?.date, ' Link: ', coursePartDate?.link );
                            callbackurls.push({name: product.name + ' - ' + coursePartDate?.course_parts?.[0]?.header, date: coursePartDate?.date, link: coursePartDate?.link})
                        })
                    } else {
                        callbackurls.push({ name: product.name, date: date.isDateIndividual ? 'Indywidualny termin' : date.date, link: date.webinarLink});
                    }

                  
                    boughtWebinarDateIds.push(date.id)
                    return {productId: product.metadata.id, date: date.date, productTitle: product.name, quantity: item.quantity, isIndividual: date.isDateIndividual };
                }))

                // if session is paid
                if (event.data.object.payment_status === 'paid') { 
                    const customerMail = event.data.object.customer_details.email;
                    console.log('EVENT +-+: ', event);
                    await strapi.service("api::order.order").create({ data: { paymentStatus: 'Paid', rawProducts: boughtItems, paymentId: event.data.object.payment_intent, course_dates: boughtWebinarDateIds, email: customerMail, } });
                    const context = {
                        callbackurls
                    }
                    console.log('BEFORE', callbackurls, boughtItems)
                    boughtItems.filter((item) => item.isIndividual).forEach(async (item) => {
                        console.log('Individual product: ', item);
                        const notificationContext = {
                            customerMail,
                            course: item
                        }
                        console.log('HERE');
                        await sendNotificationEmail('vs2001dor@gmail.com', 'ACTION REQUIRED: kupiono indywidualny webinar', notificationContext)
                    })
                    await sendPaymentConfiramtionMail(customerMail, 'Zaproszenie na Webinar', context)
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
