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

var sinon = require('sinon');
var grunt = require('grunt');

exports.common = require('./helpers/common');

function importTest(name, path) {
    describe(name, function () {
        require(path);
    });
}

describe('Wirecloud Task', function () {

    before(function () {
        sinon.stub(grunt.log, 'writeln').callsFake(() => {});
    });

    after(function () {
        grunt.log.writeln.restore();
    });

    afterEach(function () {
        exports.common.restoreReadFileSync();
    });

    importTest('Token management', './authentication.spec');
    importTest('Mashable Application Component Operations', './operations.spec');
    importTest('Utils', './utils.spec');
    importTest('Task', './task.spec');
});
