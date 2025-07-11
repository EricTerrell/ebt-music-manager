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

const fs = require('fs');
const path = require('path');

const StringLiterals = require('../lib/stringLiterals');
const Hash = require("./hash");
const NumericUtils = require('./numericUtils');

module.exports = class AudioFileUtils {
    static isFlac(filePath) {
        return AudioFileUtils.#getFileType(filePath, false) === StringLiterals.FLAC_FILE_TYPE;
    }

    static isMP3(filePath) {
        return AudioFileUtils.#getFileType(filePath, false) === StringLiterals.MP3_FILE_TYPE;
    }

    static isPlaylist(filePath) {
        return AudioFileUtils.#getFileType(filePath, false) === StringLiterals.PLAYLIST_FILE_TYPE;
    }

    static isAudioFile(settings, filePath) {
        const fileType = AudioFileUtils.#getFileType(filePath, false);

        return settings.audioFileTypeActions.find(element => fileType === element.fileType) !== undefined;
    }

    static shouldTranscode(settings, filePath) {
        const fileType = AudioFileUtils.#getFileType(filePath, false);

        return settings.audioFileTypeActions.find(
            item => item.fileType === fileType && item.action === StringLiterals.CONVERT_TO_MP3) !== undefined;
    }

    static shouldCopyAsIs(settings, filePath) {
        const fileType = AudioFileUtils.#getFileType(filePath, false);

        return settings.audioFileTypeActions.find(
            item => item.fileType === fileType && item.action === StringLiterals.COPY) !== undefined;
    }

    static shouldUpdate(metadata, settings, sourceFilePath, targetFolderPath, sizesMustMatch = false) {
        let shouldUpdate = true;

        try {
            const targetFilePath = AudioFileUtils.getTargetFilePath(metadata, settings, sourceFilePath,
                targetFolderPath);
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

    static getTargetFileType(settings, sourceFilePath) {
        const sourceFileType = AudioFileUtils.#getFileType(sourceFilePath, false);

        const rule = settings.audioFileTypeActions.find(item => item.fileType === sourceFileType);

        let fileType;

        if (rule.action === StringLiterals.CONVERT_TO_MP3) {
            fileType = StringLiterals.MP3_FILE_TYPE;
        } else if (rule.action === StringLiterals.COPY) {
            fileType = sourceFileType;
        }

        return fileType;
    }

    static getTargetFilePath(metadata, settings, sourceFilePath, targetFolderPath) {
        let targetFilePath;

        if (AudioFileUtils.isPlaylist(sourceFilePath)) {
            const fileName = path.basename(sourceFilePath);

            targetFilePath = `${targetFolderPath}${path.sep}${StringLiterals.PLAYLISTS_TARGET_FOLDER}${path.sep}${fileName}`;
        } else {
            const fileMetadata = metadata.audioFilePathToMetadata[sourceFilePath];

            const album = Hash.generateHash(fileMetadata.common.album);

            const disc  = NumericUtils.zeroPad(fileMetadata.common.disk.no,  3);
            const track = NumericUtils.zeroPad(fileMetadata.common.track.no, 3);

            const fileName = `${disc}-${track}`;

            const targetFileType = AudioFileUtils.getTargetFileType(settings, sourceFilePath);

            targetFilePath = `${targetFolderPath}${path.sep}${StringLiterals.MUSIC_TARGET_FOLDER}${path.sep}${album}${path.sep}${fileName}.${targetFileType}`;
        }

        return targetFilePath;
    }

    static #getFileType(filePath, includeDot) {
        const fileType = path.extname(filePath).toLowerCase();

        return includeDot ? fileType : fileType.slice(1);
    }

    static getPlaylistGenres(metadata, filePath) {
        const entry = metadata.playlists[filePath];

        const genres = new Set();

        entry.map(playlist => {
            const audioFilePath = playlist.audioFilePath;
            const trackMetadata = metadata.audioFilePathToMetadata[audioFilePath];

            const genreArray = trackMetadata?.common?.genre;

            if (genreArray !== undefined && genreArray.length === 1 && genreArray[0].length > 0) {
                genres.add(genreArray[0]);
            }
        });

        return genres;
    }
};
