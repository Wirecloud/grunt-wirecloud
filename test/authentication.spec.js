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

const grunt = require('grunt');
const request = require('request');
const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
const inquirer = require('inquirer');
const webdriver = require('selenium-webdriver');
const until = require('selenium-webdriver').until;
const URL = require('url');
const jf = require('jsonfile');

const common = require('./helpers/common');
const Auth = require('../tasks/lib/authentication');

chai.use(chaiAsPromised);

describe('Authentication', function () {

    afterEach(function () {
        common.restoreOperation('get');
    });

    it('should get an existing token', function () {
        const token_value = 'mytoken';
        common.stubReadFileSync({
            'hosts': {
                'some_instance': {
                    'url': 'http://example.com',
                    'token_info': {
                        'access_token': token_value,
                        'expires_on': Infinity
                    }
                }
            }
        });
        return Auth.get_token(grunt, 'some_instance').then((instance) => {
            expect(instance.token_info.access_token).to.deep.equal(token_value);
        });
    });

    describe('Using password', function () {

        beforeEach(function () {
            sinon.stub(Date, 'now').returns(200000);
            sinon.stub(inquirer, 'prompt').returns({
                then: function (cb) {
                    return cb({username: 'user', password: 'pass'});
                }
            });
            common.stubOperation('get', {statusCode: 200}, '{"flows": ["Resource Owner Password Credentials Grant"]}');
        });

        afterEach(function () {
            Date.now.restore();
            inquirer.prompt.restore();
            common.restoreOperation('post');
        });

        it('should authenticate using a password', function () {
            const token_info = {
                expires_in: 100
            };
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
            return Auth.get_token(grunt, 'some_instance').then((instance) => {
                expect(instance.token_info).to.deep.equal({
                    expires_in: token_info.expires_in,
                    expires_on: 280000
                });
            });
        });

        it('should reject if authentication responds with an error', function () {
            const error = 'Some error';
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
            const promise = Auth.get_token(grunt, 'some_instance');
            expect(promise).to.be.rejectedWith(error);
        });

        it('should reject if authentication responds with an invalid password error', function () {
            const error = 'Invalid username or password';
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
            const promise = Auth.get_token(grunt, 'some_instance');
            expect(promise).to.be.rejectedWith(error);
        });

        it('should reject if authentication responds unexpectedly', function () {
            const error = 'Unexpected response from server';
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
            const promise = Auth.get_token(grunt, 'some_instance');
            expect(promise).to.be.rejectedWith(error);
        });
    });

    describe('Using Token', function () {

        before(function () {
            sinon.stub(jf, 'writeFileSync');
            sinon.stub(webdriver.Builder.prototype, "forBrowser").callsFake(function () {return new webdriver.Builder();});
            sinon.stub(webdriver.Builder.prototype, "build").callsFake(function () {return new webdriver.WebDriver();});
            sinon.stub(webdriver.WebDriver.prototype, "get");
            sinon.stub(webdriver.WebDriver.prototype, "wait");
            sinon.stub(webdriver.WebDriver.prototype, "quit");
            sinon.stub(webdriver.WebDriver.prototype, "getCurrentUrl").callsFake(function () {
                return new Promise(function (resolve, reject) {
                    resolve();
                });
            });
            sinon.stub(until, 'urlStartsWith');
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
            sinon.stub(Date, 'now').returns(200000);
            common.stubOperation('get', {statusCode: 200}, '{"flows": ["Token"]}');
        });

        afterEach(function () {
            Date.now.restore();
            common.restoreOperation('post');
        });

        it('should reject if token authentication responds with an error', function () {
            const error = 'Error';
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
            const promise = Auth.get_token(grunt, 'some_instance');
            expect(promise).to.be.rejectedWith(error);
        });

        it('should reject if token authentication responds with an unexpected status code', function () {
            const error = 'Unexpected response from server';
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
            const promise = Auth.get_token(grunt, 'some_instance');
            expect(promise).to.be.rejectedWith(error);
        });

        it('should authenticate using an oauth token', function () {
            const token_info = {expires_in: 100};
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
            const promise = Auth.get_token(grunt, 'some_instance');
            return promise.then((instance_info) => {
                expect(instance_info.token_info.expires_in).to.equal(100);
                expect(instance_info.token_info.expires_on).to.equal(280000);
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
        const promise = Auth.get_token(grunt, 'some_instance');
        expect(promise).to.be.rejected;
    });
});

describe('Interactive instance creation', function () {

    beforeEach(function () {
        sinon.stub(jf, 'writeFileSync');
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
        const promise = Auth.get_token(grunt, 'some_instance');
        return promise.catch(() => {});
    });

    it('should create a new instance if no instance had been created before', function () {
        sinon.stub(inquirer, 'prompt').returns({
            then: function (cb) {
                return cb({url: '', client_id: '', client_secret: ''});
            }
        });
        common.stubReadFileSync({});
        const promise = Auth.get_token(grunt, 'some_instance');
        return promise.catch(() => {});
    });

});
