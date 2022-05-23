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

const FileSystemUtils = require('../lib/fileSystemUtils');

describe("FileSystemUtils tests", function () {
    it('Should not change valid folder name', function () {
        const folderName = 'EricTerrell';
        const validFolder = FileSystemUtils.validFolderName(folderName);

        expect(validFolder).to.be.equal(folderName);
    });

    it('Should not start with "."', function () {
        const folderName = '.EricTerrell';
        const validFolder = FileSystemUtils.validFolderName(folderName);

        expect(validFolder).to.be.equal("EricTerrell");
    });

    it('Should handle illegal characters', function () {
        const folderName = 'Eric/?<>\\:*|"^Terrell';
        const validFolder = FileSystemUtils.validFolderName(folderName);

        expect(validFolder).to.be.equal("Eric##########Terrell");
    });

    it('should retrieve files and directories', function() {
        const results = FileSystemUtils.getAllFilePaths('H:\\temp\\SmallTest\\TargetFolder');

        const size = Object.keys(results).length;

        expect(size).to.equal(111);

        expect(results['H:\\temp\\SmallTest\\TargetFolder\\metadata.json']).to.be.true;
    });
});
