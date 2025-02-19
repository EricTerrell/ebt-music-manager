/*
  EBT Music Manager
  (C) Copyright 2025, Eric Bergman-Terrell

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

const ScanForMetadata = require('../lib/scanForMetadata');
const DataTableUtils = require('../lib/dataTableUtils');

describe("DataTableUtils tests", function () {
    this.timeout(0);

    it('should generate table data', async function () {
        //this.skip();

        const metadata = await ScanForMetadata.scan(
            'H:\\temp\\SmallTest\\SourceFolder', 'H:\\temp\\SmallTest\\TargetFolder');

        const tableData = DataTableUtils.toTableData(metadata);

        expect(tableData).to.not.be.null;

        expect(metadata.playlistFilePaths.length).to.be.equal(1401);
        expect(Object.keys(metadata.audioFilePathToMetadata).length).to.be.equal(28224 + 210);
        expect(Object.keys(metadata.targetPathToSourcePath).length).to.be.equal(28224 + 210 + 1401);
    });
});