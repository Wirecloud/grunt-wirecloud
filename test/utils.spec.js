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

const chai = require('chai');
const expect = chai.expect;
const AdmZip = require('adm-zip');
const sinon = require('sinon');

const Utils = require('../tasks/lib/utils');
const common = require('./helpers/common');

describe('config.xml file', function () {

    it('should get config data from zip file', function () {
        const zip = new AdmZip('test/fixtures/correct.wgt');
        const expectedData = zip.getEntries()[0].getData().toString();
        const actualData = Utils.getConfigData('test/fixtures/correct.wgt');
        expect(expectedData).to.equal(actualData);
    });

    it('should fail if zip file does not exist', function () {
        expect(Utils.getConfigData.bind(null, 'test/fixtures/none.wgt')).to.throw('Invalid filename');
    });

    it('should fail if zip file does not contain a config file', function () {
        expect(Utils.getConfigData.bind(null, 'test/fixtures/no_config.wgt')).to.throw(Error, 'Zip file did not contain a config.xml file');
    });
});

describe('grunt-wirecloud config file', function () {
    describe('read_config', function () {
        before(function () {
            sinon.stub(Utils, 'get_config_file_name').returns('');
        });

        after(function () {
            Utils.get_config_file_name.restore();
        });

        it('should read the config file',function () {
            const expectedContent = 'some_content';
            common.stubReadFileSync(expectedContent);
            expect(Utils.read_config()).to.equal(expectedContent);
        });

        it('should fail with ENOENT', function () {
            const expectedError = {code: 'ENOENT'};
            common.stubReadFileSync(null, expectedError);
            expect(Utils.read_config()).to.be.empty;
        });

        it('should with error other than ENOENT', function () {
            const expectedError = 'Error';
            common.stubReadFileSync(null, expectedError);
            expect(Utils.read_config).to.throw(expectedError);
        });
    });

});

describe('Validate no empty', function () {
    it('should require a value when no value is passed', function () {
        const errorMessage = 'A value is required.';
        expect(Utils.validate_no_empty()).to.equal(errorMessage);
    });

    it('should require a value when an empty string is passed', function () {
        const errorMessage = 'A value is required.';
        expect(Utils.validate_no_empty('')).to.equal(errorMessage);
    });

    it('should return true', function () {
        expect(Utils.validate_no_empty('something')).to.equal(true);
    });
});
