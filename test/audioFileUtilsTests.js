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

describe('AudioFileUtils Tests', async function () {
    it('should identify .flac file', function () {
        expect(AudioFileUtils.isFlac('C:\\temp\\whatever.flac')).to.be.true;
        expect(AudioFileUtils.isFlac('C:\\temp\\whatever.mp3')).to.be.false;
    });

    it('should identify .mp3 file', function () {
        expect(AudioFileUtils.isMP3('C:\\temp\\whatever.flac')).to.be.false;
        expect(AudioFileUtils.isMP3('C:\\temp\\whatever.mp3')).to.be.true;
    });

    it('should identify .m3u file', function () {
        expect(AudioFileUtils.isPlaylist('C:\\temp\\whatever.flac')).to.be.false;
        expect(AudioFileUtils.isPlaylist('C:\\temp\\whatever.m3u')).to.be.true;
    });

    it('should identify files to be copied', function () {
        expect(AudioFileUtils.shouldCopyAsIs('C:\\temp\\whatever.flac')).to.be.false;
        expect(AudioFileUtils.shouldCopyAsIs('C:\\temp\\whatever.mp3')).to.be.true;
    });

    it('should identify files to be transcoded', function () {
        expect(AudioFileUtils.shouldTranscode('C:\\temp\\whatever.flac')).to.be.true;
        expect(AudioFileUtils.shouldTranscode('C:\\temp\\whatever.mp3')).to.be.false;
    });
});
