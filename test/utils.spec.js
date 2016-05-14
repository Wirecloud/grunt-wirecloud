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
var AdmZip = require('adm-zip');

var Utils = require('../tasks/lib/utils');

describe('Config file', function () {

    it('should get config data from zip file', function () {
        var zip = new AdmZip('test/fixtures/correct.wgt');
        var expectedData = zip.getEntries()[0].getData().toString();
        var actualData = Utils.getConfigData('test/fixtures/correct.wgt');
        expect(expectedData).to.equal(actualData);
    });

    it('should fail if zip file does not exist', function () {
        expect(Utils.getConfigData.bind(null, 'test/fixtures/none.wgt')).to.throw('Invalid filename');
    });

    it('should fail if zip file does not contain a config file', function () {
        expect(Utils.getConfigData.bind(null, 'test/fixtures/no_config.wgt')).to.throw(Error, 'Zip file did not contain a config.xml file');
    });
});
