'use strict';

var chai = require('chai');
var expect = chai.expect;
var chaiAsPromised = require('chai-as-promised');
var WirecloudTask = require('../tasks/lib/utils.js');
var request = require('request');
var sinon = require('sinon');
var grunt = require('grunt');
var jf = require('jsonfile');
var fs = require('fs');
var inquirer = require('inquirer');
var webdriver = require('selenium-webdriver');
var until = require('selenium-webdriver').until;
var URL = require('url');
var AdmZip = require('adm-zip');

chai.use(chaiAsPromised);

describe('Wirecloud Task', function () {

    before(function () {
        sinon.stub(grunt.log, 'writeln', function () {});
    });

    after(function () {
        grunt.log.writeln.restore();
    });

    afterEach(function () {
        if (jf.readFileSync.restore) {
            jf.readFileSync.restore();
        }
    });

    // Should stub get_token instead, so it is not coupled with other methods' tests
    function stubReadFileSync(response) {
        sinon.stub(jf, 'readFileSync', function () {
            return response;
        });
    }

    function stubOperation(method, response, body, error) {
        var cb = function (obj, func) {func(error, response, body);};
        sinon.stub(request, method, cb);
    }

    describe('Token management', function () {

        it('should get an existing token', function () {
            var token_value = 'mytoken';
            stubReadFileSync({
                'hosts': {
                    'some_instance': {
                        'token_info': {
                            'access_token': token_value
                        }
                    }
                }
            });
            return WirecloudTask.get_token(grunt, 'some_instance').then(function (token) {
                expect(token.token_info.access_token).to.equal(token_value);
            });
        });

        describe('Authentication', function () {

            afterEach(function () {
                request.get.restore();
            });

            describe('Using password', function () {

                beforeEach(function () {
                    sinon.stub(inquirer, 'prompt', function (questions, cb) {
                        cb({username: 'user', password: 'pass'});
                    });
                    stubOperation('get', {statusCode: 200}, '{"flows": ["Resource Owner Password Credentials Grant"]}');
                    sinon.stub(jf, 'writeFileSync', function () {});
                });

                afterEach(function () {
                    inquirer.prompt.restore();
                    jf.writeFileSync.restore();
                    request.post.restore();
                });

                it('should authenticate using a password', function () {
                    var token_info = {};
                    stubOperation('post', {statusCode: 200}, JSON.stringify(token_info));
                    stubReadFileSync({
                        'hosts': {
                            'some_instance': {
                                url: '',
                                client_id: '',
                                client_secret: ''
                            }
                        }
                    });
                    var promise = WirecloudTask.get_token(grunt, 'some_instance');
                    expect(promise).to.eventually.equal({'token_info': token_info});
                });

                it('should reject if authentication responds with an error', function () {
                    var error = 'Some error';
                    stubOperation('post', {statusCode: 400}, '{}', error);
                    stubReadFileSync({
                        'hosts': {
                            'some_instance': {
                                url: '',
                                client_id: '',
                                client_secret: ''
                            }
                        }
                    });
                    var promise = WirecloudTask.get_token(grunt, 'some_instance');
                    expect(promise).to.be.rejectedWith(error);
                });

                it('should reject if authentication responds with an invalid password error', function () {
                    var error = 'Invalid username or password';
                    stubOperation('post', {statusCode: 401}, '{}');
                    stubReadFileSync({
                        'hosts': {
                            'some_instance': {
                                url: '',
                                client_id: '',
                                client_secret: ''
                            }
                        }
                    });
                    var promise = WirecloudTask.get_token(grunt, 'some_instance');
                    expect(promise).to.be.rejectedWith(error);
                });

                it('should reject if authentication responds unexpectedly', function () {
                    var error = 'Unexpected response from server';
                    stubOperation('post', {statusCode: 400}, '{}');
                    stubReadFileSync({
                        'hosts': {
                            'some_instance': {
                                url: '',
                                client_id: '',
                                client_secret: ''
                            }
                        }
                    });
                    var promise = WirecloudTask.get_token(grunt, 'some_instance');
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
                    stubOperation('get', {statusCode: 200}, '{"flows": ["Token"]}');
                });

                afterEach(function () {
                    request.post.restore();
                });

                it('should reject if token authentication responds with an error', function () {
                    var error = 'Error';
                    stubOperation('post', {statusCode: 400}, '', error);
                    stubReadFileSync({
                        'hosts': {
                            'some_instance': {
                                url: '',
                                client_id: '',
                                client_secret: ''
                            }
                        }
                    });
                    var promise = WirecloudTask.get_token(grunt, 'some_instance');
                    expect(promise).to.be.rejectedWith(error);
                });

                it('should reject if token authentication responds with an unexpected status code', function () {
                    var error = 'Unexpected response from server';
                    stubOperation('post', {statusCode: 400}, '');
                    stubReadFileSync({
                        'hosts': {
                            'some_instance': {
                                url: '',
                                client_id: '',
                                client_secret: ''
                            }
                        }
                    });
                    var promise = WirecloudTask.get_token(grunt, 'some_instance');
                    expect(promise).to.be.rejectedWith(error);
                });

                it('should authenticate using an oauth token', function () {
                    var token_info = {};
                    stubOperation('post', {statusCode: 200}, JSON.stringify(token_info));
                    stubReadFileSync({
                        'hosts': {
                            'some_instance': {
                                url: '',
                                client_id: '',
                                client_secret: ''
                            }
                        }
                    });
                    var promise = WirecloudTask.get_token(grunt, 'some_instance');
                    expect(promise).to.eventually.equal({'token_info': token_info});
                });
            });

            it('should reject when authentication fails', function () {
                stubOperation('get', {statusCode: 400}, '{}');
                stubReadFileSync({
                    'hosts': {
                        'some_instance': {
                            url: '',
                            client_id: '',
                            client_secret: ''
                        }
                    }
                });
                var promise = WirecloudTask.get_token(grunt, 'some_instance');
                expect(promise).to.be.rejected;
            });
        });

        describe('Interactive instance creation', function () {

            beforeEach(function() {
                sinon.stub(jf, 'writeFileSync', function () {});
                sinon.stub(request, 'get', function () {});
            });

            afterEach(function () {
                request.get.restore();
                inquirer.prompt.restore();
                jf.writeFileSync.restore();
            });

            it('should create a new instance if the one specified does not exist', function () {
                sinon.stub(inquirer, 'prompt', function (questions, cb) {
                    cb({url: '', client_id: '', client_secret: ''});
                });
                stubReadFileSync({'hosts': {}});
                var promise = WirecloudTask.get_token(grunt, 'some_instance');
                expect(promise).to.eventually.equal({url: '', client_id: '', client_secret : ''});
            });

            it('should create a new instance if no instance had been created before', function () {
                sinon.stub(inquirer, 'prompt', function (questions, cb) {
                    cb({url: '', client_id: '', client_secret: ''});
                });
                stubReadFileSync({});
                var promise = WirecloudTask.get_token(grunt, 'some_instance');
                expect(promise).to.eventually.equal({url: '', client_id: '', client_secret : ''});
            });
        });
    });

    describe('Mashable Application Component Operations', function () {

        beforeEach(function () {
            stubReadFileSync({
                'hosts': {
                    'some_instance': {
                        'token_info': {
                            'access_token': 'some_token'
                        }
                    }
                }
            });
        });

        describe('Delete', function () {

            afterEach(function () {
                request.del.restore();
            });

            it('should delete a MAC', function () {
                stubOperation('del', {statusCode:200});
                return WirecloudTask.uninstall_mac(grunt, 'some_instance', 'name', 'vendor', 'version').then(function () {
                    expect(request.del.called).to.equal(true);
                });
            });

            it('should fail to delete when there is an unexpected response', function () {
                var response = {statusCode:404};
                stubOperation('del', response);
                var promise = WirecloudTask.uninstall_mac(grunt, 'some_instance', 'name', 'vendor', 'version');
                return expect(promise).to.be.rejectedWith('Unexpected error code: ' + response.statusCode);
            });

            it('should fail to delete when given an unknown instance name', function () {
                stubOperation('del', null);
                sinon.stub(inquirer, 'prompt', function () {});
                WirecloudTask.uninstall_mac(grunt, 'unknown_instance', 'name', 'vendor', 'version');
                expect(inquirer.prompt.called).to.equal(true);
                inquirer.prompt.restore();
            });

            it('should fail to delete when an error occurs in the request', function () {
                var error = {message: "error message"};
                stubOperation('del', undefined, undefined, error);
                var promise = WirecloudTask.uninstall_mac(grunt, 'some_instance', 'name', 'vendor', 'version');
                return expect(promise).to.be.rejectedWith('An error occurred while processing the post request: ' + error.message);
            });
        });

        describe('Check', function () {

            afterEach(function () {
                request.get.restore();
            });

            it('should check if a MAC exists', function () {
                stubOperation('get', {statusCode:200});
                return WirecloudTask.mac_exists(grunt, 'some_instance', 'name', 'vendor', 'version').then(function () {
                    expect(request.get.called).to.equal(true);
                });
            });

            it ('should return true if the server responds with 200 (MAC exist)', function () {
                stubOperation('get', {statusCode:200});
                return WirecloudTask.mac_exists(grunt, 'some_instance', 'name', 'vendor', 'version').then(function (exists) {
                    expect(exists).to.equal(true);
                });
            });

            it('should return false if the server responds with 404 (MAC does not exist)', function () {
                stubOperation('get', {statusCode:404, error: {}});
                return WirecloudTask.mac_exists(grunt, 'some_instance', 'name', 'vendor', 'version').then(function (exists) {
                    expect(exists).to.equal(false);
                });
            });

            it('should fail to check a MAC when server responds with error other than 404', function () {
                var response = {statusCode:400, error: {}};
                stubOperation('get', response);
                var promise = WirecloudTask.mac_exists(grunt, 'some_instance', 'name', 'vendor', 'version');
                return expect(promise).to.be.rejectedWith('Unexpected error code: ' + response.statusCode);
            });

            it('should fail to check when given an unknown instance', function () {
                stubOperation('get', {statusCode:200});
                sinon.stub(inquirer, 'prompt', function () {});
                WirecloudTask.mac_exists(grunt, 'unknown_instance', 'name', 'vendor', 'version');
                expect(inquirer.prompt.called).to.equal(true);
                inquirer.prompt.restore();
            });

            it('should fail to check when an error occurs in the request', function () {
                var error = {message: "error message"};
                stubOperation('get', undefined, undefined, error);
                var promise = WirecloudTask.mac_exists(grunt, 'some_instance', 'name', 'vendor', 'version');
                return expect(promise).to.be.rejectedWith('An error occurred while processing the post request: ' + error.message);
            });
        });

        describe('Upload', function () {

            function stubStream(event) {
                // Stub ReadStream.prototype 'on' and 'pipe' methods
                var Obj = {
                    on: function (receivedEvent, cb) {
                        if (event === receivedEvent) {
                            cb();
                        }
                    },
                    pipe: function (cb) {cb();}
                };
                sinon.stub(fs, 'createReadStream', function () { return Obj;});
                sinon.stub(fs, 'statSync', function () {return {size: 1};});
            }

            function restoreStream() {
                if (fs.createReadStream.restore) {
                    fs.createReadStream.restore();
                }
                if (fs.statSync.restore) {
                    fs.statSync.restore();
                }
            }

            beforeEach(function () {
                stubStream('open');
            });

            afterEach(function () {
                restoreStream();
                if (request.post.restore) {
                    request.post.restore();
                }
            });

            it('should upload a new MAC', function () {
                stubOperation('post', {statusCode: 200});
                return WirecloudTask.upload_mac(grunt, "some_instance", "File").then(function () {
                    expect(request.post.called).to.equal(true);
                });
            });

            it('should resolve if sever response is 200 or 201', function () {
                // Test status 200
                stubOperation('post', {statusCode: 200});
                var resp200 = WirecloudTask.upload_mac(grunt, "some_instance", "File").then(function () {});
                expect(resp200).to.be.resolved;

                request.post.restore(); // Restore post method to stub with a new statusCode

                // Test status 201
                stubOperation('post', {statusCode: 201});
                var resp201 = WirecloudTask.upload_mac(grunt, "some_instance", "File").then(function () {});
                expect(resp201).to.be.resolved;
            });

            it('should reject if server responds with an error', function () {
                stubOperation('post', {statusCode: 400});
                var promise = WirecloudTask.upload_mac(grunt, "some_instance", "File").then(function () {});
                expect(promise).to.be.rejectedWith('Unexpected response from server');
            });

            it('should reject if the stream throws an error', function () {
                // Restore stream stubs and stub again with error event
                restoreStream();
                stubStream('error');

                var promise = WirecloudTask.upload_mac(grunt, "some_instance", "File").then(function () {});
                expect(promise).to.be.rejected;
            });

            it('should reject if filesystem can\'t read file\'s size', function () {
                restoreStream(); // Restore stream so it executes the real method fs.statSync
                var promise = WirecloudTask.upload_mac(grunt, "some_instance", "File").then(function () {});
                expect(promise).to.be.rejected;
            });

            it('should fail to upload when an error occurs in the request', function () {
                var error = {message: "error message"};
                stubOperation('post', undefined, undefined, error);
                var promise = WirecloudTask.upload_mac(grunt, 'some_instance', 'name', 'vendor', 'version');
                return expect(promise).to.be.rejectedWith('An error occurred while processing the post request: ' + error.message);
            });
        });
    });

    describe('Config file', function () {
        it('should get config data from zip file', function () {
            var zip = new AdmZip('test/fixtures/correct.wgt');
            var expectedData = zip.getEntries()[0].getData().toString();
            var actualData = WirecloudTask.getConfigData('test/fixtures/correct.wgt');
            expect(expectedData).to.equal(actualData);
        });

        it('should fail if zip file does not exist', function () {
            expect(WirecloudTask.getConfigData.bind(null, 'test/fixtures/none.wgt')).to.throw('Invalid filename');
        });

        it('should fail if zip file does not contain a config file', function () {
            expect(WirecloudTask.getConfigData.bind(null, 'test/fixtures/no_config.wgt')).to.throw(Error, 'Zip file did not contain a config.xml file');
        });
    });
});
