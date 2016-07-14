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

var request = require('request');
var chai = require('chai');
var expect = chai.expect;
var fs = require('fs');
var grunt = require('grunt');
var sinon = require('sinon');
var inquirer = require('inquirer');
var chaiAsPromised = require('chai-as-promised');

var common = require('./main.spec').common;
var ops = require('../tasks/lib/operations');

chai.use(chaiAsPromised);

beforeEach(function () {
    common.stubReadFileSync({
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
        common.stubOperation('del', {statusCode:200});
        return ops.uninstall_mac(grunt, 'some_instance', 'name', 'vendor', 'version').then(function () {
            expect(request.del.called).to.equal(true);
        });
    });

    it('should fail to delete when there is an unexpected response', function () {
        var response = {statusCode:404};
        common.stubOperation('del', response);
        var promise = ops.uninstall_mac(grunt, 'some_instance', 'name', 'vendor', 'version');
        return expect(promise).to.be.rejectedWith('Unexpected error code: ' + response.statusCode);
    });

    it('should fail to delete when given an unknown instance name', function () {
        common.stubOperation('del', null);
        sinon.stub(inquirer, 'prompt', function () {});
        ops.uninstall_mac(grunt, 'unknown_instance', 'name', 'vendor', 'version');
        expect(inquirer.prompt.called).to.equal(true);
        inquirer.prompt.restore();
    });

    it('should fail to delete when an error occurs in the request', function () {
        var error = {message: "error message"};
        common.stubOperation('del', undefined, undefined, error);
        var promise = ops.uninstall_mac(grunt, 'some_instance', 'name', 'vendor', 'version');
        return expect(promise).to.be.rejectedWith('An error occurred while processing the post request: ' + error.message);
    });
});

describe('Check', function () {

    afterEach(function () {
        request.get.restore();
    });

    it('should check if a MAC exists', function () {
        common.stubOperation('get', {statusCode:200});
        return ops.mac_exists(grunt, 'some_instance', 'name', 'vendor', 'version').then(function () {
            expect(request.get.called).to.equal(true);
        });
    });

    it ('should return true if the server responds with 200 (MAC exist)', function () {
        common.stubOperation('get', {statusCode:200});
        return ops.mac_exists(grunt, 'some_instance', 'name', 'vendor', 'version').then(function (exists) {
            expect(exists).to.equal(true);
        });
    });

    it('should return false if the server responds with 404 (MAC does not exist)', function () {
        common.stubOperation('get', {statusCode:404, error: {}});
        return ops.mac_exists(grunt, 'some_instance', 'name', 'vendor', 'version').then(function (exists) {
            expect(exists).to.equal(false);
        });
    });

    it('should fail to check a MAC when server responds with error other than 404', function () {
        var response = {statusCode:400, error: {}};
        common.stubOperation('get', response);
        var promise = ops.mac_exists(grunt, 'some_instance', 'name', 'vendor', 'version');
        return expect(promise).to.be.rejectedWith('Unexpected error code: ' + response.statusCode);
    });

    it('should fail to check when given an unknown instance', function () {
        common.stubOperation('get', {statusCode:200});
        sinon.stub(inquirer, 'prompt', function () {});
        ops.mac_exists(grunt, 'unknown_instance', 'name', 'vendor', 'version');
        expect(inquirer.prompt.called).to.equal(true);
        inquirer.prompt.restore();
    });

    it('should fail to check when an error occurs in the request', function () {
        var error = {message: "error message"};
        common.stubOperation('get', undefined, undefined, error);
        var promise = ops.mac_exists(grunt, 'some_instance', 'name', 'vendor', 'version');
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
        common.stubOperation('post', {statusCode: 200});
        return ops.upload_mac(grunt, "some_instance", "File", false).then(function () {
            expect(request.post.called).to.equal(true);
        });
    });

    it('should resolve if sever response is 200 or 201', function () {
        // Test status 200
        common.stubOperation('post', {statusCode: 200});
        var resp200 = ops.upload_mac(grunt, "some_instance", "File", false).then(function () {});
        expect(resp200).to.be.resolved;

        request.post.restore(); // Restore post method to stub with a new statusCode

        // Test status 201
        common.stubOperation('post', {statusCode: 201});
        var resp201 = ops.upload_mac(grunt, "some_instance", "File", false).then(function () {});
        expect(resp201).to.be.resolved;
    });

    it('should reject if server responds with an error', function () {
        common.stubOperation('post', {statusCode: 400});
        var promise = ops.upload_mac(grunt, "some_instance", "File", false).then(function () {});
        expect(promise).to.be.rejectedWith('Unexpected response from server');
    });

    it('should reject if the stream throws an error', function () {
        // Restore stream stubs and stub again with error event
        restoreStream();
        stubStream('error');

        var promise = ops.upload_mac(grunt, "some_instance", "File", false).then(function () {});
        expect(promise).to.be.rejected;
    });

    it('should reject if filesystem can\'t read file\'s size', function () {
        restoreStream(); // Restore stream so it executes the real method fs.statSync
        var promise = ops.upload_mac(grunt, "some_instance", "File", false).then(function () {});
        expect(promise).to.be.rejected;
    });

    it('should fail to upload when an error occurs in the request', function () {
        var error = {message: "error message"};
        common.stubOperation('post', undefined, undefined, error);
        var promise = ops.upload_mac(grunt, 'some_instance', 'File', false);
        return expect(promise).to.be.rejectedWith('An error occurred while processing the post request: ' + error.message);
    });

    it('should upload a MAC making it public', function () {
        common.stubOperation('post', {statusCode: 200});
        return ops.upload_mac(grunt, "some_instance", "File", true).then(function () {
            var url = request.post.args[0][0].url;
            expect(url).to.include('public=true');
        });
    });

    it('should fail to upload a MAC if the isPublic parameter is not a boolean', function () {
        var publicErrorMsg = 'Error: isPublic parameter must be a boolean.';
        common.stubOperation('post', {statusCode: 200});
        var promise = ops.upload_mac(grunt, "some_instance", "File", "Not a boolean");
        expect(promise).to.be.rejectedWith(publicErrorMsg);
    });
});
