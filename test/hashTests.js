/*
  EBT Music Manager
  (C) Copyright 2022, Eric Bergman-Terrell

  This file is part of EBT Music Manager.

    EBT Music Manager is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    EBT Music Manager is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with EBT Music Manager.  If not, see <http://www.gnu.org/licenses/>.
*/

const expect = require('chai').expect;

const Hash = require('../lib/hash');

describe('Hash tests', async function () {
    it('should generate hash', function () {
        for (let i = 0; i < 100; i++) {
            const expectedResult = '7451-4d9d-9bcf-6cdf-1316-1e67-0519-d6aa-d433-2e12-7a93-1e1c-2f24-04b1-bb0f-4301';

            expect(Hash.generateHash('Eric Terrell')).to.equal(expectedResult);
            expect(expectedResult.length).to.equal(79);
        }

        for (let i = 0; i < 100; i++) {
            const expectedResult = 'f3f5-dfdf-7568-5f79-85f4-f30c-30f0-d905-8190-c298-978d-cf94-5492-586f-b239-9932';

            expect(Hash.generateHash('Eric Terrell ')).to.equal(expectedResult);
            expect(expectedResult.length).to.equal(79);
        }
    });
});
