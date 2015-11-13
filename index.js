'use strict';

var request = require('request');
var Promise = require('bluebird');
var createError = require('http-errors');
var _ = require('lodash');
var urlLib = require('url');
var EventEmitter = require('events').EventEmitter;
var utils = require('./utils');

function Shimo(options) {
  this.options = _.defaults(options || {}, {
    protocol: 'https',
    host: 'api.shimo.im',
    requestOpts: { json: true }
  });
  this.options.base = this.options.protocol + '://' + this.options.host;

  EventEmitter.call(this);
}
util.inherits(Redis, EventEmitter);

Shimo.prototype._request = function (options) {
  var query = _.pick(options, ['method', 'qs', 'body', 'json']);
  query.url = this.options.base + (path[0] === '/' ? path : '/' + path);
  if (this.options.accessToken) {
    query.headers = { Authorization: 'Bearer ' + this.options.accessToken };
  }

  var _this = this;
  return apiRequest(query).catch(function (err) {
    if (err.status !== 401 || options.retried || !_this.options.refreshToken) {
      throw err;
    }
    return _this.token('refresh_token', {
      refresh_token: _this.options.refreshToken
    }).then(function (res) {
      _this.emit('accesstoken_change', res.access_token);
      _this.options.accessToken = res.access_token;
      _this.emit('refreshtoken_change', res.refresh_token);
      _this.options.refreshToken = res.refresh_token;
      return _this.request(_.assign({}, options, { retried: true }));
    });
  });
};

var methods = ['head', 'get', 'post', 'put', 'delete', 'patch'];

methods.forEach(function (method) {
  Shimo.prototype[method] = function (path, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = null;
    }
    options = _.defaults({}, options, this.options.requestOpts);
    options.method = method;
    options.path = path;
    return this._request(options).asCallback(callback);
  };
});

Shimo.prototype.token = function (grantType, options, callback) {
  return this.post('oauth/token', {
    json: false,
    body: _.assign(options, { grant_type: grantType })
  }, callback);
};

Shimo.prototype.authorization = function (options, callback) {
  return urlLib.format({
    protocol: this.options.protocol,
    pathname: 'oauth/authorization',
    host: this.options.host,
    query: _.assign(options, {
      client_id: this.options.clientId,
      response_type: 'code'
    })
  });
};

function apiRequest(query) {
  return new Promise(function (resolve, reject) {
    request(query, function (error, response, body) {
      if (error) {
        throw error;
      }
      var code = response.statusCode;
      if (code.toString()[0] !== '2') {
        if (body && body.error) {
          throw createError(code, body.error);
        }
        throw createError(code);
      }
      resolve(body);
    });
  });
}

module.exports = Shimo;
