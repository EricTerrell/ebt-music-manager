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
const Hash = require('../lib/hash');
const Constants = require('../lib/constants');
const AudioFileUtils = require('../lib/audioFileUtils');

// https://en.wikipedia.org/wiki/M3U

module.exports = class Playlist {
    #sourceFilePath;
    #fileName;
    #targetFolder;

    constructor(sourceFilePath, targetFolder) {
        this.#sourceFilePath = sourceFilePath;
        this.#targetFolder = targetFolder;
        this.#fileName = path.basename(sourceFilePath);
    }

    get sourceFilePath() { return this.#sourceFilePath; }

    getAudioFilePaths() {
        let audioFilePaths = [];

        if (fs.existsSync(this.#sourceFilePath)) {
            const data = fs.readFileSync(this.#sourceFilePath, Constants.READ_WRITE_FILE_OPTIONS);
            const lines = data.toString().split(/\r?\n/);

            audioFilePaths = lines
                .map(line => line.trim())
                .filter(line => line.length > 0 && !line.startsWith(StringLiterals.PLAYLIST_COMMENT_DELIMITER));
        } else {
            console.warn(`getAudioFilePaths: cannot find file "${this.#sourceFilePath}"`);
        }

        return audioFilePaths;
    }

    write(metadata, callback, settings) {
        const playlistTargetFilePath = this.getTargetFilePath();

        if (fs.existsSync(playlistTargetFilePath)) {
            fs.rmSync(playlistTargetFilePath);
        }

        const audioFilePaths = this.getAudioFilePaths();

        audioFilePaths.forEach(audioFilePath => {
            try {
                const album = Hash.generateHash(metadata.audioFilePathToMetadata[audioFilePath].common.album);
                const fileType = path.extname(audioFilePath);
                const fileName = Hash.generateHash(path.basename(audioFilePath, fileType));
                const targetFileType = AudioFileUtils.getTargetFileType(settings, audioFilePath);

                const playlistLine = `..${path.sep}${StringLiterals.MUSIC_TARGET_FOLDER}${path.sep}${album}${path.sep}${fileName}.${targetFileType}\r\n`;

                fs.appendFileSync(playlistTargetFilePath, playlistLine, Constants.READ_WRITE_FILE_OPTIONS);
            } catch (err) {
                callback(`Playlist.write: cannot retrieve metadata for file "${audioFilePath}" exception: ${err}`);
            }
        });
    }

    static rewrite(audioFilePaths, sourceFilePath) {
        if (fs.existsSync(sourceFilePath)) {
            console.log(`Playlist.rewrite: audioFilePaths: ${JSON.stringify(audioFilePaths)} sourceFilePath: "${sourceFilePath}"`);

            fs.rmSync(sourceFilePath);
        }

        audioFilePaths.forEach(audioFilePath => {
            try {
                const playlistLine = `${audioFilePath}\r\n`;

                fs.appendFileSync(sourceFilePath, playlistLine, Constants.READ_WRITE_FILE_OPTIONS);
            } catch (err) {
                console.error(`Playlist.rewrite: cannot retrieve metadata for file "${audioFilePath}" exception: ${err}`);
            }
        });
    }

    getTargetFilePath() {
        return path.join(this.#targetFolder, StringLiterals.PLAYLISTS_TARGET_FOLDER, this.#fileName);
    }

    verify(metadata, errors) {
        const audioFilePaths = this.getAudioFilePaths();

        audioFilePaths.forEach(audioFilePath => {
            audioFilePath = audioFilePath
                .replace(`..${path.sep}`, StringLiterals.EMPTY_STRING);

            audioFilePath = `${this.#targetFolder}${path.sep}${audioFilePath}`;

            console.log(audioFilePath);

            if (!fs.existsSync(audioFilePath)) {
                errors.push(`Playlist.verify: playlist: ${this.#fileName} referenced file "${audioFilePath}" does not exist in target folder`);
            }
        });
    }
};
