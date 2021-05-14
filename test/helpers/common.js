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

const sinon = require('sinon');
const jf = require('jsonfile');
const request = require('request');

// Should stub get_token instead, so it is not coupled with other methods' tests
module.exports.stubReadFileSync = function stubReadFileSync(response, error) {
    sinon.stub(jf, 'readFileSync').callsFake(function () {
        if (error) {
            throw error;
        }
        return response;
    });
};

module.exports.restoreReadFileSync = function restoreReadFileSync() {
    if (jf.readFileSync.restore) {
        jf.readFileSync.restore();
    }
};

module.exports.stubOperation = function stubOperation(method, response, body, error) {
    const cb = function (obj, func) {func(error, response, body);};
    sinon.stub(request, method).callsFake(cb);
};

module.exports.restoreOperation = function restoreReadFileSync(method) {
    if (request[method].restore) {
        request[method].restore();
    }
};
