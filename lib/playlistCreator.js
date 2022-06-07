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

const fs = require('fs');
const path = require('path');

const StringLiterals = require('../lib/stringLiterals');
const Constants = require('../lib/constants');
const Files = require('../lib/files');

// https://en.wikipedia.org/wiki/M3U

const FileSystemUtils = require('./fileSystemUtils');

module.exports = class PlaylistCreator {
    static write(playlistFilePath, tracks) {
        const folderPath = path.dirname(playlistFilePath);

        if (!fs.existsSync(folderPath)) {
            console.log(`PlaylistCreator: creating playlists folder "${folderPath}"`);

            fs.mkdirSync(folderPath, { 'recursive': true });
        }

        if (fs.existsSync(playlistFilePath)) {
            fs.rmSync(playlistFilePath);
        }

        console.log(`PlaylistCreator: writing to playlist file "${playlistFilePath}"`);

        for (const track of tracks) {
            console.log(`track: ${track.name}`);

            const line = `${track.name}\r\n`;

            fs.appendFileSync(playlistFilePath, line, Constants.READ_WRITE_FILE_OPTIONS);
        }

        return playlistFilePath;
    }

    static getFullPath(playlistFilename) {
        const settings = Files.getSettings();

        return path.join(settings.sourceFolder, StringLiterals.PLAYLISTS_TARGET_FOLDER,
            `${FileSystemUtils.validFileName(playlistFilename)}.${StringLiterals.PLAYLIST_FILE_TYPE}`);
    }
};
