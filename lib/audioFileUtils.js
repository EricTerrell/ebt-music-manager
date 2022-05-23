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

module.exports = class AudioFileUtils {
    static isFlac(filePath) {
        return path.extname(filePath).toLowerCase() === `.${StringLiterals.FLAC_FILE_TYPE}`;
    }

    static isMP3(filePath) {
        return path.extname(filePath).toLowerCase() === `.${StringLiterals.MP3_FILE_TYPE}`;
    }

    static isPlaylist(filePath) {
        return path.extname(filePath).toLowerCase() === `.${StringLiterals.PLAYLIST_FILE_TYPE}`;
    }

    static isAudioFile(filePath) {
        return this.isMP3(filePath) || this.isFlac(filePath);
    }

    static shouldTranscode(filePath) {
        return this.isFlac(filePath);
    }

    static shouldCopyAsIs(filePath) {
        return this.isMP3(filePath);
    }

    static shouldUpdate(sourceFilePath, targetFilePath, sizesMustMatch = false) {
        let shouldUpdate = true;

        try {
            const sourceFileStat = fs.statSync(sourceFilePath);

            if (fs.existsSync(targetFilePath)) {
                const targetFileStat = fs.statSync(targetFilePath);

                shouldUpdate = sourceFileStat.mtimeMs > targetFileStat.mtimeMs || targetFileStat.size === 0;

                if (sizesMustMatch && sourceFileStat.size !== targetFileStat.size) {
                    shouldUpdate = true;
                }
            }
        } catch (err) {
            console.log(err);
        }

        return shouldUpdate;
    }
};
