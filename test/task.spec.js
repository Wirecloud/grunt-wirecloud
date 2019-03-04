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

var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;
var fs = require('fs');
var grunt = require('grunt');
var sinon = require('sinon');
var inquirer = require('inquirer');
var chaiAsPromised = require('chai-as-promised');
var ConfigParser = require('wirecloud-config-parser');

var common = require('./main.spec').common;
var task = require('../tasks/lib/task');
var ops = require('../tasks/lib/operations');
var utils = require('../tasks/lib/utils');

chai.use(chaiAsPromised);

var done, options, data;

before(function () {
    sinon.stub(grunt.log, 'error');
    sinon.stub(grunt.log, 'ok');
    sinon.stub(grunt.log, 'write');
});

after(function () {
    grunt.log.error.restore();
    grunt.log.ok.restore();
    grunt.log.write.restore();
});

beforeEach(function () {
    data = {
        file: 'file'
    };
    done = sinon.spy();
    options = {
        instance: 'local',
    };
});

it('should fail if there is no file', function () {
    var data = {};
    task.execute(data, options, grunt, done);
    assert(done.withArgs(false).calledOnce);
});

it('should upload a MAC without overwriting', function () {
    sinon.stub(ops, 'upload_mac').callsFake(function () {
        return new Promise(function (resolve, reject) {
            resolve();
        });
    });

    return task.execute(data, options, grunt, done).then(function () {
        expect(done.calledOnce).to.equal(true);
        ops.upload_mac.restore();
    });
});

describe('Overwrite', function () {
    var config;
    before(function () {
        config = fs.readFileSync('test/fixtures/sample-config.xml');
    });

    beforeEach(function () {
        options.overwrite = true;
        sinon.stub(utils, 'getConfigData').returns(config);
        sinon.stub(ops, 'mac_exists').returns(Promise.resolve(true));
        sinon.stub(ops, 'uninstall_mac').returns(Promise.resolve());
        sinon.stub(ops, 'upload_mac').returns(Promise.resolve());
    });

    afterEach(function () {
        utils.getConfigData.restore();
        ops.mac_exists.restore();
        ops.uninstall_mac.restore();
        ops.upload_mac.restore();
    });

    it('should overwrite an existing MAC', function () {
        return task.execute(data, options, grunt, done).then(function () {
            expect(ops.uninstall_mac.called).to.equal(true);
            assert(done.calledOnce);
        });
    });

    it('should not overwrite if MAC does not exist', function () {
        ops.mac_exists.restore();
        sinon.stub(ops, 'mac_exists').returns(Promise.resolve(false));
        return task.execute(data, options, grunt, done).then(function () {
            expect(ops.uninstall_mac.called).to.equal(false);
            assert(done.calledOnce);
        });
    });

    it('should fail to overwrite when config file cannot be read', function () {
        utils.getConfigData.restore();
        sinon.stub(utils, 'getConfigData').callsFake(function () {throw 'Cannot read';});

        task.execute(data, options, grunt, done);
        assert(done.withArgs(false).calledOnce);
    });

    it('should fail to overwrite when an operation throws an error', function () {
        ops.mac_exists.restore();
        sinon.stub(ops, 'mac_exists').returns(Promise.reject(new Error('ERROR')));
        return task.execute(data, options, grunt, done).then(function () {
            assert(done.withArgs(false).calledOnce);
        });
    });
});
