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

    static isAudioFile(settings, filePath) {
        const fileType = path.extname(filePath).toLowerCase().slice(1);

        return settings.audioFileTypeActions.find(element => fileType === element.fileType) !== undefined;
    }

    static shouldTranscode(settings, filePath) {
        const fileType = path.extname(filePath).slice(1).toLowerCase();

        return settings.audioFileTypeActions.find(
            item => item.fileType === fileType && item.action === StringLiterals.CONVERT_TO_MP3) !== undefined;
    }

    static shouldCopyAsIs(settings, filePath) {
        const fileType = path.extname(filePath).slice(1).toLowerCase();

        return settings.audioFileTypeActions.find(
            item => item.fileType === fileType && item.action === StringLiterals.COPY) !== undefined;
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

                // For playlists, update if any referenced audio files don't exist
                if (!shouldUpdate && AudioFileUtils.isPlaylist(sourceFilePath)) {
                    const Playlist = require('../lib/playlist');

                    const playlist = new Playlist(targetFilePath, null);

                    for (const relativePath of playlist.getAudioFilePaths()) {
                        console.log(relativePath);

                        const folder = path.dirname(targetFilePath);
                        console.log(folder);

                        const absolutePath = path.resolve(folder, relativePath);

                        if (!fs.existsSync(absolutePath)) {
                            shouldUpdate = true;
                            break;
                        }
                    }
                }
            }
        } catch (err) {
            console.log(err);
        }

        return shouldUpdate;
    }

    static getTargetFileType(settings, sourceFilePath) {
        const sourceFileType = path.extname(sourceFilePath).slice(1).toLowerCase();

        const rule = settings.audioFileTypeActions.find(item => item.fileType === sourceFileType);

        let fileType;

        if (rule.action === StringLiterals.CONVERT_TO_MP3) {
            fileType = StringLiterals.MP3_FILE_TYPE;
        } else if (rule.action === StringLiterals.COPY) {
            fileType = sourceFileType;
        }

        return fileType;
    }
};
