module.exports = [
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'script-src': ["'self'", "editor.unlayer.com"],
          'connect-src': ["'self'", 'https:', "editor.unlayer.com"],
          'frame-src': ["'self'", "editor.unlayer.com"],
          'img-src': ["'self'", 'data:', 'blob:', 'res.cloudinary.com', "data:", "cdn.jsdelivr.net", "strapi.io", "s3.amazonaws.com" ],
          'media-src': ["'self'", 'data:', 'blob:', 'res.cloudinary.com'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      patchKoa: true,
      multipart: true,
      includeUnparsed: true,
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
