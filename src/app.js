const express = require('express');
const path = require('path');
const helmet = require('helmet');
const config = require('./config');

function createApp() {
  const app = express();
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);
  app.set('view engine', 'ejs');
  app.set('views', path.join(config.root, 'views'));

  const secureTransport = config.https || config.trustProxy > 0;
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        'upgrade-insecure-requests': secureTransport ? [] : null,
      },
    },
    hsts: secureTransport,
  }));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.static(path.join(config.root, 'public')));
  app.locals.rupiah = require('./utils/format').rupiah;
  app.locals.dateID = require('./utils/format').dateID;

  app.get('/health', (req, res) => res.send('ok'));

  const { setupGuard, requireAuth } = require('./middleware/auth');
  const { notFound, errorHandler } = require('./middleware/errors');

  app.use(require('./config/session'));
  app.use(require('./middleware/csrf'));
  app.use(require('./middleware/flash'));
  app.use(setupGuard);
  app.use(require('./routes/auth'));
  app.use(requireAuth);
  app.use(require('./routes'));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
