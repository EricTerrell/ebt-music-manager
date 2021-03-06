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
const PromisePool = require('async-promise-pool');
const prettyData = require('pretty-data').pd;

const CommandProcessor = require('../lib/commandProcessor');
const TranscoderCommand = require('../lib/transcoderCommand');
const Files = require('../lib/files');
const AudioFileUtils = require('../lib/audioFileUtils');
const LogFile = require('../lib/logFile');
const ScanForMetadata = require('../lib/scanForMetadata');
const Playlist = require('../lib/playlist');
const StringLiterals = require('../lib/stringLiterals');
const Constants = require('../lib/constants');
const Hash = require('../lib/hash');
const FileSystemUtils = require('../lib/fileSystemUtils');
const Cancel = require('../lib/cancel');
const ProgressMessage = require('../lib/progressMessage');
const Audits = require('../lib/audits');

module.exports = class Sync {
    constructor(sourceFolderPath, targetFolderPath) {
        this._sourceFolderPath = sourceFolderPath;
        this._targetFolderPath = targetFolderPath;

        this._fileStatus = {};
        this._errors = [];

        const logFilePath = path.join(this._targetFolderPath, 'ebt-music-manager.txt');
        this._logFile = new LogFile(logFilePath);
    }

    async sync(cachedAudioFilePathToMetadata = undefined) {
        const startTime = new Date();

        ProgressMessage.send(`Syncing target folder "${this._targetFolderPath}" from source folder "${this._sourceFolderPath}"`);

        if (!fs.existsSync(this._targetFolderPath)) {
            fs.mkdirSync(this._targetFolderPath);
        }

        this._logFile.write(`sync: starting at ${startTime}\r\n`);

        this._previousRunStatus = this.#getPreviousRunStatus();

        const metadata = await ScanForMetadata.scan(this._sourceFolderPath, this._targetFolderPath,
            cachedAudioFilePathToMetadata);

        this.#createTargetFolder();

        this.#deleteObsoleteFiles(metadata);

        // Write metadata.json *after* call to _deleteObsoleteFiles.
        ScanForMetadata.writeMetadata(metadata, this._targetFolderPath);

        this.#writeStatus();

        this.totalItemsToProcess = this.#totalItemsToProcess(metadata);

        this._logFile.write(`\r\nTotal Items to Process: ${this.totalItemsToProcess}\r\n`);

        const musicFolderPath = path.join(this._targetFolderPath, StringLiterals.MUSIC_TARGET_FOLDER);

        this.#createAlbumFolders(metadata.albums, musicFolderPath);

        this.#syncPlaylists(this._targetFolderPath, metadata, this.#recordError.bind(this),
            this.#recordStatus.bind(this));

        // Copy audio files that don't need to be transcoded
        this.#syncNonTranscodableAudioFiles(musicFolderPath, metadata.audioFilePathToMetadata,
            this.#recordStatus.bind(this));

        const settings = Files.getSettings();

        // Transcode audio files that need to be transcoded
        const concurrentPromisePool = new PromisePool({ concurrency: settings.concurrency });

        this.#prepareToSyncTranscodableAudioFiles(concurrentPromisePool, musicFolderPath,
            metadata.audioFilePathToMetadata, this.#recordStatus.bind(this));

        await concurrentPromisePool.all();

        this.#verifyResults(metadata);

        this.#displayStatus(metadata);

        this.#audits(metadata);

        const stopTime = new Date();
        const elapsedMinutes = (stopTime - startTime) / (1000.0 * 60.0);

        ProgressMessage.send(`Sync completed\\r\\n\\r\\n${stopTime}\\r\\n\\r\\nElapsed minutes: ${elapsedMinutes.toFixed(2)}`, 100.0, true);

        this._logFile.write(`\r\nSync completed at ${stopTime}\r\n\r\nElapsed minutes: ${elapsedMinutes.toFixed(2)}`);

        return metadata;
    }

    #getPreviousRunStatus() {
        const filePath = path.join(this._targetFolderPath, StringLiterals.TRANSCODING_STATUS_FILENAME);

        if (fs.existsSync(filePath)) {
            try {
                const fileContent = fs.readFileSync(filePath, Constants.READ_WRITE_FILE_OPTIONS).toString();

                fs.rmSync(filePath);

                return JSON.parse(fileContent);
            } catch (err) {
                console.error(err);
            }
        }

        return null;
    }

    #totalItemsToProcess(metadata) {
        return Object.keys(metadata.audioFilePathToMetadata).length + metadata.playlistFilePaths.length;
    }

    #createTargetFolder() {
        if (!fs.existsSync(this._targetFolderPath)) {
            fs.mkdirSync(this._targetFolderPath);
        }
    }

    #deleteObsoleteFiles(metadata) {
        this.#createTargetFolder();

        const settings = Files.getSettings();

        const previousAudioFileTypeActions = JSON.stringify(this?._previousRunStatus?.settings?.audioFileTypeActions);
        const currentAudioFileTypeActions = JSON.stringify(settings.audioFileTypeActions);

        if (this._previousRunStatus === null ||
            this._previousRunStatus.sourceFolder !== this._sourceFolderPath ||
            this._previousRunStatus.targetFolder !== this._targetFolderPath ||
            settings.bitRate !== this._previousRunStatus.settings.bitRate ||
            currentAudioFileTypeActions !== previousAudioFileTypeActions) {
            this._logFile.write(`\r\nDeleting all content in target folder (no _previousRunStatus or settings changed)`);

            if (fs.existsSync(this._targetFolderPath)) {
                const options = {
                    'recursive': true,
                    'force': true
                };

                fs.rmSync(this._targetFolderPath, options)
                this.#createTargetFolder();
            }
        } else {
            Object.keys(FileSystemUtils.getAllFilePaths(this._targetFolderPath))
                .forEach(targetFilePath => {
                    Cancel.checkForCancellation();

                    this.#deleteObsoleteFile(settings, targetFilePath, metadata);
                });
        }
    }

    #deleteObsoleteFile(settings, targetFilePath, metadata) {
        // If there is not a source file corresponding to the target file, delete the target file.
        if (AudioFileUtils.isAudioFile(settings, targetFilePath) || AudioFileUtils.isPlaylist(targetFilePath)) {
            const sourceFilePath = metadata.targetPathToSourcePath[targetFilePath];

            if (sourceFilePath === undefined) {
                ProgressMessage.send(`Deleting obsolete file "${targetFilePath}"`);

                fs.rmSync(targetFilePath);
                this._logFile.write(`DELETED FILE "${targetFilePath}"`);

                // Delete folder if it's empty now
                const folderPath = path.dirname(targetFilePath);

                const dirItems = fs.readdirSync(folderPath);
                const numberOfItems = Object.keys(dirItems).length;

                if (numberOfItems === 0) {
                    ProgressMessage.send(`Deleting empty folder "${folderPath}"`);

                    fs.rmdirSync(folderPath);

                    this._logFile.write(`DELETED EMPTY FOLDER "${folderPath}"`);
                }
            }
        }
    }

    #verifyResults(metadata) {
        this._logFile.write('\r\nVerify Results:\r\n');

        // Verify that all playlist entries point to files in the proper target folder directories.

        metadata.playlistFilePaths.forEach(playlistPath => {
            const fileName = path.basename(playlistPath);
            const filePath = path.join(this._targetFolderPath, StringLiterals.PLAYLISTS_TARGET_FOLDER, fileName);

            new Playlist(filePath, this._targetFolderPath).verify(metadata, this._errors);
        });
    }

    #writeStatus() {
        const statusFilePath = path.join(this._targetFolderPath, StringLiterals.TRANSCODING_STATUS_FILENAME);

        const settings = Files.getSettings();

        const data = {
            'settings': {
                'bitRate': settings.bitRate,
                'audioFileTypeActions': settings.audioFileTypeActions
            },
            'sourceFolder': this._sourceFolderPath,
            'targetFolder': this._targetFolderPath,
            'status': this._fileStatus,
            'errors': this._errors
        };

        fs.writeFileSync(statusFilePath, prettyData.json(JSON.stringify(data)), Constants.READ_WRITE_FILE_OPTIONS);
    }

    #createAlbumFolders(albums, musicFolderPath) {
        ProgressMessage.send('Creating Album Folders');

        if (!fs.existsSync(musicFolderPath)) {
            fs.mkdirSync(musicFolderPath);
        }

        Object.keys(albums).forEach(album => {
            Cancel.checkForCancellation();

            const albumPath = path.join(musicFolderPath, Hash.generateHash(album));

            if (!fs.existsSync(albumPath)) {
                fs.mkdirSync(albumPath);
            }
        })
    }

    #syncPlaylists(targetFolder, metadata, recordErrorCallback, recordStatusCallback) {
        const playlistsFolderPath = path.join(targetFolder, StringLiterals.PLAYLISTS_TARGET_FOLDER);

        if (!fs.existsSync(playlistsFolderPath)) {
            fs.mkdirSync(playlistsFolderPath);
        }

        const settings = Files.getSettings();

        metadata.playlistFilePaths.forEach(playlistSourceFilePath => {
            Cancel.checkForCancellation();

            ProgressMessage.send(`Copying Playlist ${path.basename(playlistSourceFilePath)} to Target Folder`);

            const playlist = new Playlist(playlistSourceFilePath, targetFolder, recordErrorCallback);

            let success;

            try {
                playlist.write(metadata, recordErrorCallback, settings);
                success = true;
            } catch (err) {
                success = false;
            } finally {
                recordStatusCallback(playlistSourceFilePath, playlist.getTargetFilePath(), success);
            }
        });
    }

    #syncNonTranscodableAudioFiles(musicFolderPath, audioFilePathToMetadata, callback) {
        const getTargetFilePath = this.#getTargetFilePath.bind(this);
        const copyFile = this.#copyFile.bind(this);

        const settings = Files.getSettings();

        Object.entries(audioFilePathToMetadata)
            .filter(([sourceFilePath]) => AudioFileUtils.shouldCopyAsIs(settings, sourceFilePath))
            .forEach(function ([sourceFilePath, metadata]) {
                const targetFolder = path.join(musicFolderPath, Hash.generateHash(metadata.common.album));
                const targetFileType = path.extname(sourceFilePath).slice(1);
                const targetFilePath = getTargetFilePath(targetFolder, sourceFilePath, targetFileType);

                if (AudioFileUtils.shouldUpdate(sourceFilePath, targetFilePath, true)) {
                    Cancel.checkForCancellation();

                    ProgressMessage.send(`Copying File "${sourceFilePath}" to "${targetFilePath}"`);

                    copyFile(sourceFilePath, targetFilePath, callback);
                }
            });
    }

    #prepareToSyncTranscodableAudioFiles(pool, targetFolder, audioFilePathToMetadata, callback) {
        const log = this._logFile.write.bind(this._logFile);

        const settings = Files.getSettings();

        Object.entries(audioFilePathToMetadata)
            .filter(([sourceFilePath]) => AudioFileUtils.shouldTranscode(settings, sourceFilePath))
            .forEach(function([sourceFilePath, metadata]) {
                Cancel.checkForCancellation();

                const result = TranscoderCommand.createCommand(targetFolder, sourceFilePath,
                    metadata.common.album, settings.bitRate);

                pool.add(() => CommandProcessor.execShellCommand(result.command, sourceFilePath, result.targetFilePath, callback, log))
        });
    }

    #copyFile(sourceFilePath, targetFilePath, callback) {
        let success;

        try {
            if (AudioFileUtils.shouldUpdate(sourceFilePath, targetFilePath)) {
                fs.copyFileSync(sourceFilePath, targetFilePath);
            }
            success = true;
        } catch (err) {
            this._logFile.write(`ERROR: ${err}`);
            success = false;
        } finally {
            callback(sourceFilePath, targetFilePath, success);
        }
    }

    #getTargetFilePath(targetFolder, sourceFilePath, targetFileType) {
        const fileType = path.extname(sourceFilePath);
        const targetFileName = `${path.basename(sourceFilePath, fileType)}`;
        const hashedFileName = `${Hash.generateHash(targetFileName)}.${targetFileType}`;

        return path.join(`${targetFolder}`, hashedFileName);
    }

    #recordError(error) {
        this._errors.push(error);
    }

    #recordStatus(sourceFilePath, targetFilePath, success) {
        if (!success) {
            console.error(`FAILURE: sourceFilePath: "${sourceFilePath}" targetFilePath: "${targetFilePath}"`);
        }

        let sourceFileStat = null;

        try {
            sourceFileStat = fs.statSync(sourceFilePath);
        } catch (err) {
            console.error(err);
        }

        let targetFileStat = null;

        try {
            targetFileStat = fs.statSync(targetFilePath);
        } catch (err) {
            console.error(err);
        }

        this._fileStatus[targetFilePath] = {
            sourceFilePath,
            sourceFileStat,
            targetFileStat,
            success
        };

        const numberOfItems = Object.keys(this._fileStatus).length;
        const percentComplete = numberOfItems * 100.0 / this.totalItemsToProcess;

        ProgressMessage.send(`${numberOfItems.toLocaleString()} of ${this.totalItemsToProcess.toLocaleString()} items processed`, percentComplete);
    }

    #displayStatus(metadata) {
        ProgressMessage.send('Writing log entries');

        const log = this._logFile.write.bind(this._logFile);

        log('\r\n_displayStatus:');

        log(`\r\nPlaylists: ${metadata.playlistFilePaths.length}`);

        const albums = {};

        Object.entries(metadata.audioFilePathToMetadata).forEach(function([, item]) {
            albums[item.common.album] = true;
        });

        log(`Albums: ${Object.keys(albums).length}`);
        log(`Tracks: ${Object.keys(metadata.audioFilePathToMetadata).length}`);

        let successes = 0;
        let failures = 0;

        Object.entries(this._fileStatus).forEach(function([, {success}]) {
            if (success) {
                successes++;
            } else {
                failures++;
            }
        });

        log(`\r\n\r\ntotal files processed (playlists + tracks): ${successes + failures}\r\n\r\nsuccesses: ${successes}\r\nfailures: ${failures}\r\n`);

        log('\r\nsuccesses:\r\n');

        Object.entries(this._fileStatus).forEach(function([key, {sourceFilePath, success}]) {
            if (success) {
                log(`sourceFilePath: "${sourceFilePath}" targetFilePath: "${key}"`);
            }
        });

        log('\r\nfailures:\r\n');

        Object.entries(this._fileStatus).forEach(function([key, {sourceFilePath, success}]) {
            if (!success) {
                log(`sourceFilePath: "${sourceFilePath}" targetFilePath: "${key}"`);
            }
        });

        log('\r\n\r\nErrors:\r\n\r\n');

        this._errors.forEach(error => {
            log(`Error: ${error}`);
        })
    }

    #audits(metadata) {
        ProgressMessage.send('Writing audit results to log');

        const log = this._logFile.write.bind(this._logFile);

        log('\r\nAudits:');

        const auditFunctions = [
            Audits.sourcePlaylistTracksDoNotExist,
            Audits.targetPlaylistTracksDoNotExist,
            Audits.tracksNotInPlaylists,
            Audits.sourceMediaNotInTargetFolder
        ];

        auditFunctions.forEach(auditFunction => {
            const result = auditFunction(metadata);

            log(`\r\n${result.header}:`);

            if (result.lines.length === 0) {
                log('\tno issues');
            } else {
                let text = StringLiterals.EMPTY_STRING;

                result.lines.forEach(line => {
                    text += `\t${line}`;
                });

                log(text);
            }
        });
    }
};
