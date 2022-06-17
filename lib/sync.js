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

        this._previousRunStatus = this._getPreviousRunStatus();

        const metadata = await ScanForMetadata.scan(this._sourceFolderPath, this._targetFolderPath,
            cachedAudioFilePathToMetadata);
        ScanForMetadata.writeMetadata(metadata, this._targetFolderPath);

        this._createTargetFolder();

        this._deleteObsoleteFiles(metadata);

        this.totalItemsToProcess = this._totalItemsToProcess(metadata);

        this._logFile.write(`\r\nTotal Items to Process: ${this.totalItemsToProcess}\r\n`);

        const musicFolderPath = path.join(this._targetFolderPath, StringLiterals.MUSIC_TARGET_FOLDER);

        this._createAlbumFolders(metadata.albums, musicFolderPath);

        this._writePlaylists(this._targetFolderPath, metadata, this._recordError.bind(this),
            this._recordStatus.bind(this));

        // Copy audio files that don't need to be transcoded
        this._copyNonTranscodableAudioFiles(musicFolderPath, metadata.audioFilePathToMetadata,
            this._recordStatus.bind(this));

        const settings = Files.getSettings();
        // Transcode audio files that need to be transcoded
        const concurrentPromisePool = new PromisePool({ concurrency: settings.concurrency });

        this._prepareToCopyTranscodableAudioFiles(concurrentPromisePool, musicFolderPath,
            metadata.audioFilePathToMetadata, this._recordStatus.bind(this));

        await concurrentPromisePool.all();

        this._verifyResults(metadata);

        this._writeStatus();

        this._displayStatus(metadata);

        this._audits(metadata);

        const stopTime = new Date();
        const elapsedMinutes = (stopTime - startTime) / (1000.0 * 60.0);

        ProgressMessage.send(`Sync completed\\r\\n\\r\\n${stopTime}\\r\\n\\r\\nElapsed minutes: ${elapsedMinutes.toFixed(2)}`, 100.0, true);

        this._logFile.write(`\r\nSync completed at ${stopTime}\r\n\r\nElapsed minutes: ${elapsedMinutes.toFixed(2)}`);
    }

    _getPreviousRunStatus() {
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

    _totalItemsToProcess(metadata) {
        return Object.keys(metadata.audioFilePathToMetadata).length + metadata.playlistFilePaths.length;
    }

    _createTargetFolder() {
        if (!fs.existsSync(this._targetFolderPath)) {
            fs.mkdirSync(this._targetFolderPath);
        }
    }

    _deleteObsoleteFiles(metadata) {
        this._createTargetFolder();

        const settings = Files.getSettings();

        if (this._previousRunStatus === null ||
            this._previousRunStatus.sourceFolder !== this._sourceFolderPath ||
            this._previousRunStatus.targetFolder !== this._targetFolderPath ||
            settings.bitRate !== this._previousRunStatus.settings.bitRate) {
            this._logFile.write(`\r\nDeleting all content in target folder (no _previousRunStatus or bit rate changed)`);

            if (fs.existsSync(this._targetFolderPath)) {
                const options = {
                    'recursive': true,
                    'force': true
                };

                fs.rmSync(this._targetFolderPath, options)
                this._createTargetFolder();
            }
        } else {
            Object.keys(FileSystemUtils.getAllFilePaths(this._targetFolderPath))
                .forEach(targetFilePath => {
                    Cancel.checkForCancellation();

                    this._deleteObsoleteFile(targetFilePath, metadata);
                });
        }
    }

    _deleteObsoleteFile(targetFilePath, metadata) {
        // If there is not a source file corresponding to the target file, delete the target file.
        if (AudioFileUtils.isAudioFile(targetFilePath) || AudioFileUtils.isPlaylist(targetFilePath)) {
            const sourceFilePath = metadata.targetPathToSourcePath[targetFilePath];

            if (sourceFilePath === undefined) {
                ProgressMessage.send(`Deleting obsolete file ${targetFilePath}`);

                fs.rmSync(targetFilePath);
                this._logFile.write(`DELETED FILE "${targetFilePath}"`);

                // Delete folder if it's empty now
                const folderPath = path.dirname(targetFilePath);

                const dirItems = fs.readdirSync(folderPath);
                const numberOfItems = Object.keys(dirItems).length;

                if (numberOfItems === 0) {
                    ProgressMessage.send(`Deleting empty folder ${folderPath}`);

                    fs.rmdirSync(folderPath);

                    this._logFile.write(`DELETED EMPTY FOLDER "${folderPath}"`);
                }
            }
        }
    }

    _verifyResults(metadata) {
        this._logFile.write('\r\nVerify Results:\r\n');

        // Verify that all playlist entries point to files in the proper target folder directories.

        metadata.playlistFilePaths.forEach(playlistPath => {
            const fileName = path.basename(playlistPath);
            const filePath = path.join(this._targetFolderPath, StringLiterals.PLAYLISTS_TARGET_FOLDER, fileName);

            new Playlist(filePath, this._targetFolderPath).verify(metadata, this._errors);
        });
    }

    _writeStatus() {
        const statusFilePath = path.join(this._targetFolderPath, StringLiterals.TRANSCODING_STATUS_FILENAME);

        const settings = Files.getSettings();

        const data = {
            'settings': {
                'bitRate': settings.bitRate
            },
            'sourceFolder': this._sourceFolderPath,
            'targetFolder': this._targetFolderPath,
            'status': this._fileStatus,
            'errors': this._errors
        };

        fs.writeFileSync(statusFilePath, prettyData.json(JSON.stringify(data)), Constants.READ_WRITE_FILE_OPTIONS);
    }

    _createAlbumFolders(albums, musicFolderPath) {
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

    _writePlaylists(targetFolder, metadata, recordErrorCallback, recordStatusCallback) {
        const playlistsFolderPath = path.join(targetFolder, StringLiterals.PLAYLISTS_TARGET_FOLDER);

        if (!fs.existsSync(playlistsFolderPath)) {
            fs.mkdirSync(playlistsFolderPath);
        }

        metadata.playlistFilePaths.forEach(playlistSourceFilePath => {
            Cancel.checkForCancellation();

            ProgressMessage.send(`Copying Playlist ${path.basename(playlistSourceFilePath)} to Target Folder`);

            const playlist = new Playlist(playlistSourceFilePath, targetFolder, recordErrorCallback);

            let success;

            try {
                playlist.write(metadata, recordErrorCallback);
                success = true;
            } catch (err) {
                success = false;
            } finally {
                recordStatusCallback(playlistSourceFilePath, playlist.getTargetFilePath(), success);
            }
        });
    }

    _copyNonTranscodableAudioFiles(musicFolderPath, audioFilePathToMetadata, callback) {
        const getTargetFilePath = this._getTargetFilePath.bind(this);
        const copyFile = this._copyFile.bind(this);

        Object.entries(audioFilePathToMetadata)
            .filter(([sourceFilePath]) => AudioFileUtils.shouldCopyAsIs(sourceFilePath))
            .forEach(function ([sourceFilePath, metadata]) {
                Cancel.checkForCancellation();

                const targetFolder = path.join(musicFolderPath, Hash.generateHash(metadata.common.album));
                const targetFilePath = getTargetFilePath(targetFolder, sourceFilePath);

                if (AudioFileUtils.shouldUpdate(sourceFilePath, targetFilePath, true)) {
                    ProgressMessage.send(`Copying File "${sourceFilePath}" to "${targetFilePath}"`);

                    copyFile(sourceFilePath, targetFilePath, callback);
                }
            });
    }

    _prepareToCopyTranscodableAudioFiles(pool, targetFolder, audioFilePathToMetadata, callback) {
        const log = this._logFile.write.bind(this._logFile);

        const settings = Files.getSettings();

        Object.entries(audioFilePathToMetadata)
            .filter(([sourceFilePath]) => AudioFileUtils.shouldTranscode(sourceFilePath))
            .forEach(function([sourceFilePath, metadata]) {
                Cancel.checkForCancellation();

                const result = TranscoderCommand.createCommand(targetFolder, sourceFilePath,
                    metadata.common.album, settings.bitRate);

                pool.add(() => CommandProcessor.execShellCommand(result.command, sourceFilePath, result.targetFilePath, callback, log))
        });
    }

    _copyFile(sourceFilePath, targetFilePath, callback) {
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

    _getTargetFilePath(targetFolder, sourceFilePath) {
        const fileType = path.extname(sourceFilePath);
        const targetFileName = `${path.basename(sourceFilePath, fileType)}`;
        const hashedFileName = `${Hash.generateHash(targetFileName)}.${StringLiterals.MP3_FILE_TYPE}`;

        return path.join(`${targetFolder}`, hashedFileName);
    }

    _recordError(error) {
        this._errors.push(error);
    }

    _recordStatus(sourceFilePath, targetFilePath, success) {
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

    _displayStatus(metadata) {
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

    _audits(metadata) {
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
