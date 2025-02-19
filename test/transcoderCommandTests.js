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
const path = require('path');

const TranscoderCommand = require('../lib/transcoderCommand');
const Hash = require('../lib/hash');

describe("TranscoderCommand tests", function () {
    const album = 'Eric\'s Greatest Hits';

    it('should generate proper command for FLAC source file', function () {
        const targetRootFolder = 'H:\\temp\\transcode';

        const bitRate = '256k';

        const sourceFileName = '01.flac';
        const sourceFilePath = path.join(targetRootFolder, album, sourceFileName);

        const targetFileName = Hash.generateHash('01.mp3');

        const targetFolder = Hash.generateHash(album);

        // Expect no codec specified, expect bitrate specified
        const expectedResult = `ffmpeg -y -i "H:\\temp\\transcode\\${album}\\${sourceFileName}" -b:a 256k "H:\\temp\\transcode\\${targetFolder}\\${targetFileName}"`;

        const command = TranscoderCommand.createCommand(targetRootFolder, sourceFilePath, album, bitRate);

        expect(command).to.equal(expectedResult);
    });

    it('should generate proper command for MP3 source file', function () {
        const targetRootFolder = 'H:\\temp\\transcode';

        const sourceFileName = '01.mp3';
        const sourceFilePath = path.join(targetRootFolder, album, sourceFileName);

        const targetFolder = Hash.generateHash(album);
        const targetFileName = Hash.generateHash(sourceFileName);

        // Expect copy codec specified, expect no bitrate specified
        const expectedResult = `ffmpeg -y -i "H:\\temp\\transcode\\${album}\\${sourceFileName}" -codec copy "H:\\temp\\transcode\\${targetFolder}\\${targetFileName}"`;

        const command = TranscoderCommand.createCommand(targetRootFolder, sourceFilePath, album);

        expect(command).to.equal(expectedResult);
    });
});
