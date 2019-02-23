/*
 * Copyright (c) 2015 CoNWeT Lab., Universidad Politécnica de Madrid
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

var grunt = require('grunt');
var request = require('request');
var sinon = require('sinon');
var chai = require('chai');
var expect = chai.expect;
var chaiAsPromised = require('chai-as-promised');
var inquirer = require('inquirer');
var webdriver = require('selenium-webdriver');
var until = require('selenium-webdriver').until;
var URL = require('url');
var jf = require('jsonfile');

var common = require('./main.spec').common;
var Auth = require('../tasks/lib/authentication');

chai.use(chaiAsPromised);

describe('Authentication', function () {

    afterEach(function () {
        common.restoreOperation('get');
    });

    it('should get an existing token', function () {
        var token_value = 'mytoken';
        common.stubReadFileSync({
            'hosts': {
                'some_instance': {
                    'url': 'http://example.com',
                    'token_info': {
                        'access_token': token_value,
                        'expires_on': Date.now() + 1000000
                    }
                }
            }
        });
        return Auth.get_token(grunt, 'some_instance').then((instance) => {
            expect(instance.token_info.access_token).to.equal(token_value);
        });
    });

    describe('Using password', function () {

        beforeEach(function () {
            sinon.stub(inquirer, 'prompt').returns({
                then: function (cb) {
                    return cb({username: 'user', password: 'pass'});
                }
            });
            common.stubOperation('get', {statusCode: 200}, '{"flows": ["Resource Owner Password Credentials Grant"]}');
        });

        afterEach(function () {
            inquirer.prompt.restore();
            common.restoreOperation('post');
        });

        it('should authenticate using a password', function () {
            var token_info = {};
            common.stubOperation('post', {statusCode: 200}, JSON.stringify(token_info));
            common.stubReadFileSync({
                'hosts': {
                    'some_instance': {
                        url: '',
                        client_id: '',
                        client_secret: ''
                    }
                }
            });
            var promise = Auth.get_token(grunt, 'some_instance');
            expect(promise).to.eventually.equal({url: '', client_id: '', client_secret: '', token_info: token_info});
        });

        it('should reject if authentication responds with an error', function () {
            var error = 'Some error';
            common.stubOperation('post', {statusCode: 400}, '{}', error);
            common.stubReadFileSync({
                'hosts': {
                    'some_instance': {
                        url: '',
                        client_id: '',
                        client_secret: ''
                    }
                }
            });
            var promise = Auth.get_token(grunt, 'some_instance');
            expect(promise).to.be.rejectedWith(error);
        });

        it('should reject if authentication responds with an invalid password error', function () {
            var error = 'Invalid username or password';
            common.stubOperation('post', {statusCode: 401}, '{}');
            common.stubReadFileSync({
                'hosts': {
                    'some_instance': {
                        url: '',
                        client_id: '',
                        client_secret: ''
                    }
                }
            });
            var promise = Auth.get_token(grunt, 'some_instance');
            expect(promise).to.be.rejectedWith(error);
        });

        it('should reject if authentication responds unexpectedly', function () {
            var error = 'Unexpected response from server';
            common.stubOperation('post', {statusCode: 400}, '{}');
            common.stubReadFileSync({
                'hosts': {
                    'some_instance': {
                        url: '',
                        client_id: '',
                        client_secret: ''
                    }
                }
            });
            var promise = Auth.get_token(grunt, 'some_instance');
            expect(promise).to.be.rejectedWith(error);
        });
    });

    describe('Using Token', function () {

        before(function () {
            sinon.stub(jf, 'writeFileSync', function () {});
            sinon.stub(webdriver.Builder.prototype, "forBrowser", function() {return new webdriver.Builder();});
            sinon.stub(webdriver.Builder.prototype, "build", function () {return new webdriver.WebDriver();});
            sinon.stub(webdriver.WebDriver.prototype, "get", function() {});
            sinon.stub(webdriver.WebDriver.prototype, "wait", function() {});
            sinon.stub(webdriver.WebDriver.prototype, "quit", function() {});
            sinon.stub(webdriver.WebDriver.prototype, "getCurrentUrl", function() {
                return new Promise(function (resolve, reject) {
                    resolve();
                });
            });
            sinon.stub(until, 'urlStartsWith', function () {});
            sinon.stub(URL, 'parse').returns({query: {code: ''}});
        });

        after(function () {
            jf.writeFileSync.restore();
            until.urlStartsWith.restore();
            URL.parse.restore();
            webdriver.Builder.prototype.forBrowser.restore();
            webdriver.Builder.prototype.build.restore();
            webdriver.WebDriver.prototype.get.restore();
            webdriver.WebDriver.prototype.wait.restore();
            webdriver.WebDriver.prototype.quit.restore();
            webdriver.WebDriver.prototype.getCurrentUrl.restore();
        });

        beforeEach(function () {
            sinon.stub(Date, 'now').returns(1000);
            common.stubOperation('get', {statusCode: 200}, '{"flows": ["Token"]}');
        });

        afterEach(function () {
            Date.now.restore();
            common.restoreOperation('post');
        });

        it('should reject if token authentication responds with an error', function () {
            var error = 'Error';
            common.stubOperation('post', {statusCode: 400}, '', error);
            common.stubReadFileSync({
                'hosts': {
                    'some_instance': {
                        url: '',
                        client_id: '',
                        client_secret: ''
                    }
                }
            });
            var promise = Auth.get_token(grunt, 'some_instance');
            expect(promise).to.be.rejectedWith(error);
        });

        it('should reject if token authentication responds with an unexpected status code', function () {
            var error = 'Unexpected response from server';
            common.stubOperation('post', {statusCode: 400}, '');
            common.stubReadFileSync({
                'hosts': {
                    'some_instance': {
                        url: '',
                        client_id: '',
                        client_secret: ''
                    }
                }
            });
            var promise = Auth.get_token(grunt, 'some_instance');
            expect(promise).to.be.rejectedWith(error);
        });

        it('should authenticate using an oauth token', function () {
            var token_info = {expires_in: 10};
            common.stubOperation('post', {statusCode: 200}, JSON.stringify(token_info));
            common.stubReadFileSync({
                'hosts': {
                    'some_instance': {
                        url: '',
                        client_id: '',
                        client_secret: ''
                    }
                }
            });
            var promise = Auth.get_token(grunt, 'some_instance');
            return promise.then((instance_info) => {
                expect(instance_info.token_info.expires_in).to.equal(10);
                expect(instance_info.token_info.expires_on).to.equal(990);
            });
        });
    });

    it('should reject when authentication fails', function () {
        common.stubOperation('get', {statusCode: 400}, '{}');
        common.stubReadFileSync({
            'hosts': {
                'some_instance': {
                    url: '',
                    client_id: '',
                    client_secret: ''
                }
            }
        });
        var promise = Auth.get_token(grunt, 'some_instance');
        expect(promise).to.be.rejected;
    });
});

describe('Interactive instance creation', function () {

    beforeEach(function() {
        sinon.stub(jf, 'writeFileSync', function () {});
        common.stubOperation('get', {statusCode: 404}, '{}');
    });

    afterEach(function () {
        request.get.restore();
        inquirer.prompt.restore();
        jf.writeFileSync.restore();
    });

    it('should create a new instance if the one specified does not exist', function () {
        sinon.stub(inquirer, 'prompt').returns({
            then: function (cb) {
                return cb({url: '', client_id: '', client_secret: ''});
            }
        });
        common.stubReadFileSync({'hosts': {}});
        var promise = Auth.get_token(grunt, 'some_instance');
        return promise.catch(() => {});
    });

    it('should create a new instance if no instance had been created before', function () {
        sinon.stub(inquirer, 'prompt').returns({
            then: function (cb) {
                return cb({url: '', client_id: '', client_secret: ''});
            }
        });
        common.stubReadFileSync({});
        var promise = Auth.get_token(grunt, 'some_instance');
        return promise.catch(() => {});
    });

});
