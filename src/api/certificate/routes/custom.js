module.exports = {
    routes: [
      {
        method: "GET",
        path: "/certificate/findbyuniqid/:id",
        handler: "certificate.findByUniqueId",
      },
    ],
  };
  