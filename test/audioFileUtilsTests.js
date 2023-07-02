/*
  EBT Music Manager
  (C) Copyright 2023, Eric Bergman-Terrell

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

const AudioFileUtils = require('../lib/audioFileUtils');
const StringLiterals = require('../lib/stringLiterals');

const settings = {
    "audioFileTypeActions": [
        {
            "fileType": "flac",
            "action": "convert to mp3"
        },
        {
            "fileType": "mp3",
            "action": "copy"
        }
    ]
};

const flacFilePath = 'C:\\temp\\whatever.flac';
const mp3FilePath = 'C:\\temp\\whatever.mp3';
const playlistFilePath = 'C:\\temp\\whatever.m3u';

const targetFolderPath = 'Q:\\target';

const metadata = {
    'audioFilePathToMetadata': {
        'C:\\temp\\whatever.flac': {
            'common': {
                'album': 'the greatest album of all time!'
            }
        }
    }
};

    describe('AudioFileUtils Tests', async function () {
    it('should identify .flac file', function () {
        expect(AudioFileUtils.isFlac(flacFilePath)).to.be.true;
        expect(AudioFileUtils.isFlac(mp3FilePath)).to.be.false;
    });

    it('should identify .mp3 file', function () {
        expect(AudioFileUtils.isMP3(flacFilePath)).to.be.false;
        expect(AudioFileUtils.isMP3(mp3FilePath)).to.be.true;
    });

    it('should identify .flac and .mp3 files as audio files', function () {
        expect(AudioFileUtils.isAudioFile(settings, flacFilePath)).to.be.true;
        expect(AudioFileUtils.isAudioFile(settings, mp3FilePath)).to.be.true;
    });

    it('should identify .m3u file', function () {
        expect(AudioFileUtils.isPlaylist(flacFilePath)).to.be.false;
        expect(AudioFileUtils.isPlaylist(playlistFilePath)).to.be.true;
    });

    it('should identify files to be copied as-is', function () {
        expect(AudioFileUtils.shouldCopyAsIs(settings, flacFilePath)).to.be.false;
        expect(AudioFileUtils.shouldCopyAsIs(settings, mp3FilePath)).to.be.true;
    });

    it('should identify files to be transcoded', function () {
        expect(AudioFileUtils.shouldTranscode(settings, flacFilePath)).to.be.true;
        expect(AudioFileUtils.shouldTranscode(settings,mp3FilePath)).to.be.false;
    });

    it('should determine proper target file type', function () {
        expect(AudioFileUtils.getTargetFileType(settings, flacFilePath)).to.equals(StringLiterals.MP3_FILE_TYPE);
        expect(AudioFileUtils.getTargetFileType(settings, mp3FilePath)).to.equals(StringLiterals.MP3_FILE_TYPE);
    });

    it('should determine correct target file path', function() {
       expect(AudioFileUtils.getTargetFilePath(metadata, settings, flacFilePath, targetFolderPath))
           .to.equals('Q:\\target\\Music\\5041-53a6-73be-250c-8015-7313-2405-cf78-4092-b130-0e1f-c5bc-0434-8842-9ced-608e\\257f-38c4-a0dd-b89d-70b4-371d-7009-d491-8f14-a136-4f2b-aea2-622b-4a08-8b0a-efb4.mp3');

        expect(AudioFileUtils.getTargetFilePath(metadata, settings, playlistFilePath, targetFolderPath))
            .to.equals('Q:\\target\\Playlists\\whatever.m3u');
    });
});
