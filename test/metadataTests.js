/*
  EBT Music Manager
  (C) Copyright 2024, Eric Bergman-Terrell

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

const Metadata = require('../lib/metadata');
const ScanForMetadata = require('../lib/scanForMetadata');

describe("Update metadata tests", function () {
    let data;

    beforeEach(() => {
        data = {
            'title': new Date().toString()
        };
    });

    it('should read metadata from .flac file', async function () {
        const filePath = "H:\\temp\\SourceFolder\\Music\\''Weird Al'' Yankovic\\''Weird Al'' Yankovic - The Essential ''Weird Al'' Yankoovic (Disc 1 of 2)\\02.flac";

        const metadata = await Metadata.read(filePath);

        expect(metadata.TITLE).to.equal('Polkas on 45');
    });

    it('should read metadata from .mp3 file', async function () {
        const filePath = 'H:\\temp\\SourceFolder\\Music\\Artie Shaw\\Free For All\\02 - The Blues Part 2.mp3';

        const metadata = await Metadata.read(filePath);

        expect(metadata.title).to.be.equal('The Blues Part 2');
    });

    it('should update .mp3 file', async function () {
        const filePath = 'H:\\temp\\SmallTest\\SourceFolder\\Music\\George Strait\\Icon\\01-01- Amarillo By Morning.mp3';

        const ffmetadata = await Metadata.read(filePath);
        //expect(ffmetadata.title).to.be.equal('River Of Love');

        const scanMetadata = await ScanForMetadata.retrieveMetadata(filePath);
        //expect(scanMetadata.common.title).to.be.equal('River Of Love');

        const metadata = {
            'ALBUM ARTIST': '@GEORGE STRAIT@'
        };

        await Metadata.write(filePath, metadata);

        const newMetadata = await Metadata.read(filePath);
        const newMetadata2 = await ScanForMetadata.retrieveMetadata(filePath);
    });
});