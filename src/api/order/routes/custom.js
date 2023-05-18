module.exports = {
    routes: [
      {
        method: 'POST',
        path: '/webhook',
        handler: 'order.aftertransaction',
        config: {
          auth: false,
        },
      },
    ],
  };