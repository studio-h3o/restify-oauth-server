
/**
 * Module dependencies.
 */

var InvalidArgumentError = require('oauth2-server/lib/errors/invalid-argument-error');
var NodeOAuthServer = require('oauth2-server');
var Promise = require('bluebird');
var Request = require('oauth2-server').Request;
var Response = require('oauth2-server').Response;
var UnauthorizedRequestError = require('oauth2-server/lib/errors/unauthorized-request-error');

/**
 * Constructor.
 */

function RestifyOAuthServer(options) {
  options = options || {};

  if (!options.model) {
    throw new InvalidArgumentError('Missing parameter: `model`');
  }

  this.server = new NodeOAuthServer(options);
}

/**
 * Authentication Middleware.
 *
 * Returns a middleware that will validate a token.
 *
 * (See: https://tools.ietf.org/html/rfc6749#section-7)
 */

RestifyOAuthServer.prototype.authenticate = function(options) {
  var server = this.server;

  return function(req, res, next) {
    var request = new Request(req);
    var response = new Response(res);

    return Promise.bind(this)
      .then(function() {
        return server.authenticate(request, response, options);
      })
      .tap(function(token) {
        res.oauth = { token: token };
      })
      .catch(function(e) {
        return handleError(e, req, res);
      })
      .finally(next);
  };
};

/**
 * Authorization Middleware.
 *
 * Returns a middleware that will authorize a client to request tokens.
 *
 * (See: https://tools.ietf.org/html/rfc6749#section-3.1)
 */

RestifyOAuthServer.prototype.authorize = function(options) {
  var server = this.server;

  return function(req, res, next) {
    var request = new Request(req);
    var response = new Response(res);

    return Promise.bind(this)
      .then(function() {
        return server.authorize(request, response, options);
      })
      .tap(function(code) {
        res.oauth = { code: code };
      })
      .then(function() {
        return handleResponse(req, res, response);
      })
      .catch(function(e) {
        return handleError(e, req, res, response);
      })
      .finally(next);
  };
};

/**
 * Grant Middleware.
 *
 * Returns middleware that will grant tokens to valid requests.
 *
 * (See: https://tools.ietf.org/html/rfc6749#section-3.2)
 */

RestifyOAuthServer.prototype.token = function(options) {
  var server = this.server;

  return function(req, res, next) {
    var request = new Request(req);
    var response = new Response(res);

    return Promise.bind(this)
      .then(function() {
        return server.token(request, response, options);
      })
      .tap(function(token) {
        res.oauth = { token: token };
      })
      .then(function() {
        return handleResponse(req, res, response);
      })
      .catch(function(e) {
        return handleError(e, req, res, response);
      })
      .finally(next);
  };
};

/**
 * Handle response.
 */

var handleResponse = function(req, res, response) {
  res.set(response.headers);
  res.status(response.status);
  res.send(response.body);
};

/**
 * Handle error.
 */

var handleError = function(e, req, res, response) {
  if (response) {
    res.set(response.headers);
  }

  res.status(e.code);
  res.send({ error: e.name, error_description: e.message });
};

/**
 * Export constructor.
 */

module.exports = RestifyOAuthServer;
