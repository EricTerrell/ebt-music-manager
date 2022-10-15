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
    #totalBytesSynced;
    #sourceFolderPath;
    #targetFolderPath;
    #fileStatus;
    #errors;
    #logFile;
    #previousRunStatus;
    #maxGBToSync;

    constructor(sourceFolderPath, targetFolderPath) {
        this.#sourceFolderPath = sourceFolderPath;
        this.#targetFolderPath = targetFolderPath;

        this.#fileStatus = {};
        this.#errors = [];

        const logFilePath = path.join(this.#targetFolderPath, 'ebt-music-manager.txt');
        this.#logFile = new LogFile(logFilePath);
    }

    async sync(cachedAudioFilePathToMetadata = undefined) {
        const settings = Files.getSettings();

        if (settings.limitSyncSize) {
            return this.#syncContentWithSizeLimit(settings.limitSyncSizeGB, cachedAudioFilePathToMetadata);
        } else {
            return this.#syncAllContent(cachedAudioFilePathToMetadata);
        }
    }

    #getAsyncPromisePool() {
        const settings = Files.getSettings();

        return new PromisePool({ concurrency: settings.concurrency });
    }

    async #syncAllContent(cachedAudioFilePathToMetadata = undefined) {
        const startTime = new Date();

        this.#totalBytesSynced = 0;

        ProgressMessage.send(`Syncing target folder "${this.#targetFolderPath}" from source folder "${this.#sourceFolderPath}"`);

        if (!fs.existsSync(this.#targetFolderPath)) {
            fs.mkdirSync(this.#targetFolderPath);
        }

        this.#logFile.write(`sync: starting at ${startTime}\r\n`);

        this.#previousRunStatus = this.#getPreviousRunStatus();

        const metadata = await ScanForMetadata.scan(this.#sourceFolderPath, this.#targetFolderPath,
            cachedAudioFilePathToMetadata);

        Cancel.checkForCancellation();

        this.#createTargetFolder();

        this.#deleteObsoleteFiles(metadata);

        Cancel.checkForCancellation();

        // Write metadata.json *after* call to _deleteObsoleteFiles.
        ScanForMetadata.writeMetadata(metadata, this.#targetFolderPath);

        Cancel.checkForCancellation();

        this.#writeStatus();

        Cancel.checkForCancellation();

        this.totalItemsToProcess = this.#totalItemsToProcess(metadata);

        this.#logFile.write(`\r\nTotal Items to Process: ${this.totalItemsToProcess}\r\n`);

        const musicFolderPath = path.join(this.#targetFolderPath, StringLiterals.MUSIC_TARGET_FOLDER);

        this.#createAlbumFolders(metadata.albums, musicFolderPath);

        Cancel.checkForCancellation();

        this.#syncPlaylists(this.#targetFolderPath, metadata, this.#recordError.bind(this),
            this.#recordStatus.bind(this));

        Cancel.checkForCancellation();

        // Copy audio files that don't need to be transcoded
        this.#syncNonTranscodableAudioFiles(musicFolderPath, metadata.audioFilePathToMetadata,
            this.#recordStatus.bind(this));

        Cancel.checkForCancellation();

        // Transcode audio files that need to be transcoded
        const concurrentPromisePool = this.#getAsyncPromisePool();

        this.#prepareToSyncTranscodableAudioFiles(concurrentPromisePool, musicFolderPath,
            metadata.audioFilePathToMetadata, this.#recordStatus.bind(this));

        Cancel.checkForCancellation();

        await concurrentPromisePool.all();

        this.#verifyResults(metadata);

        Cancel.checkForCancellation();

        this.#displayStatus(metadata);

        Cancel.checkForCancellation();

        this.#audits(metadata);

        Cancel.checkForCancellation();

        this.#finishSync(startTime);

        return metadata;
    }

    #finishSync(startTime) {
        this.#logFile.write(`sync: total size synced: ${this.#totalBytesSynced.toLocaleString()}\r\n`);

        const stopTime = new Date();
        const elapsedMinutes = (stopTime - startTime) / (1000.0 * 60.0);

        ProgressMessage.send(`Sync completed\\r\\n\\r\\n${stopTime}\\r\\n\\r\\nElapsed minutes: ${elapsedMinutes.toFixed(2)}`, undefined,100.0, true);

        this.#logFile.write(`\r\nSync completed at ${stopTime}\r\n\r\nElapsed minutes: ${elapsedMinutes.toFixed(2)}`);

    }

    async #syncContentWithSizeLimit(maxGBToSync, cachedAudioFilePathToMetadata = undefined) {
        const startTime = new Date();

        this.#totalBytesSynced = 0;
        this.#maxGBToSync = maxGBToSync;

        ProgressMessage.send(`Syncing target folder "${this.#targetFolderPath}" from source folder "${this.#sourceFolderPath}" max GB: ${maxGBToSync}`);

        // Ensure that target folder path exists and is empty
        if (fs.existsSync(this.#targetFolderPath)) {
            try {
                fs.rmdirSync(this.#targetFolderPath, { recursive: true });
            } catch (error) {
                console.error(error);
            }
        }

        Cancel.checkForCancellation();

        this.#createTargetFolder();

        Cancel.checkForCancellation();

        this.#logFile.write(`sync: starting at ${startTime}\r\n`);

        const metadata = await ScanForMetadata.scan(this.#sourceFolderPath, this.#targetFolderPath,
            cachedAudioFilePathToMetadata);

        Cancel.checkForCancellation();

        ScanForMetadata.writeMetadata(metadata, this.#targetFolderPath);

        Cancel.checkForCancellation();

        const musicFolderPath = path.join(this.#targetFolderPath, StringLiterals.MUSIC_TARGET_FOLDER);

        if (!fs.existsSync(musicFolderPath)) {
            fs.mkdirSync(musicFolderPath);
        }

        const playlistsFolderPath = path.join(this.#targetFolderPath, StringLiterals.PLAYLISTS_TARGET_FOLDER);

        if (!fs.existsSync(playlistsFolderPath)) {
            fs.mkdirSync(playlistsFolderPath);
        }

        let remainingPlaylistPaths = Object.values(metadata.playlistFilePaths);

        const settings = Files.getSettings();

        let pool = this.#getAsyncPromisePool();

        let playlistsProcessed = 0;

        while (remainingPlaylistPaths.length > 0 && this.#totalBytesSynced < maxGBToSync * Constants.GB) {
            Cancel.checkForCancellation();

            const index = Math.trunc(Math.random() * remainingPlaylistPaths.length);

            const playlistSourceFilePath = remainingPlaylistPaths[index];

            ProgressMessage.send(`Syncing Playlist "${path.basename(playlistSourceFilePath)}" to Target Folder`);

            this.#syncPlaylist(playlistSourceFilePath, metadata, settings);

            await this.#syncPlaylistAudioFiles(playlistSourceFilePath, metadata, settings, musicFolderPath, pool,
                this.#recordStatus.bind(this));

            remainingPlaylistPaths.splice(index, 1);

            // For best performance, pool needs to have a lot of pending operations. Force pending operations to
            // complete periodically, so we'll hopefully get close to the threshold.
            if (++playlistsProcessed % 10 === 0) {
                await pool.all();

                pool = this.#getAsyncPromisePool();
            }
        }

        await pool.all();

        this.#verifyResults(metadata);

        this.#displayStatus(metadata);

        this.#finishSync(startTime);

        return metadata;
    }

    #getPreviousRunStatus() {
        const filePath = path.join(this.#targetFolderPath, StringLiterals.TRANSCODING_STATUS_FILENAME);

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
        if (!fs.existsSync(this.#targetFolderPath)) {
            fs.mkdirSync(this.#targetFolderPath);
        }
    }

    #deleteObsoleteFiles(metadata) {
        this.#createTargetFolder();

        const settings = Files.getSettings();

        const previousAudioFileTypeActions = JSON.stringify(this?.#previousRunStatus?.settings?.audioFileTypeActions);
        const currentAudioFileTypeActions = JSON.stringify(settings.audioFileTypeActions);

        if (this.#previousRunStatus === null ||
            this.#previousRunStatus.sourceFolder !== this.#sourceFolderPath ||
            this.#previousRunStatus.targetFolder !== this.#targetFolderPath ||
            settings.bitRate !== this.#previousRunStatus.settings.bitRate ||
            currentAudioFileTypeActions !== previousAudioFileTypeActions) {
            this.#logFile.write(`\r\nDeleting all content in target folder (no previousRunStatus or settings changed)`);

            if (fs.existsSync(this.#targetFolderPath)) {
                const options = {
                    'recursive': true,
                    'force': true
                };

                fs.rmSync(this.#targetFolderPath, options)
                this.#createTargetFolder();
            }
        } else {
            Object.keys(FileSystemUtils.getAllFilePaths(this.#targetFolderPath))
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
                this.#logFile.write(`DELETED FILE "${targetFilePath}"`);

                // Delete folder if it's empty now
                const folderPath = path.dirname(targetFilePath);

                const dirItems = fs.readdirSync(folderPath);
                const numberOfItems = Object.keys(dirItems).length;

                if (numberOfItems === 0) {
                    ProgressMessage.send(`Deleting empty folder "${folderPath}"`);

                    fs.rmdirSync(folderPath);

                    this.#logFile.write(`DELETED EMPTY FOLDER "${folderPath}"`);
                }
            }
        }
    }

    #verifyResults(metadata) {
        this.#logFile.write('\r\nVerify Results:\r\n');

        // Verify that all playlist entries point to files in the proper target folder directories.

        metadata.playlistFilePaths.forEach(playlistPath => {
            const fileName = path.basename(playlistPath);
            const filePath = path.join(this.#targetFolderPath, StringLiterals.PLAYLISTS_TARGET_FOLDER, fileName);

            new Playlist(filePath, this.#targetFolderPath).verify(metadata, this.#errors);
        });
    }

    #writeStatus() {
        const statusFilePath = path.join(this.#targetFolderPath, StringLiterals.TRANSCODING_STATUS_FILENAME);

        const settings = Files.getSettings();

        const data = {
            'settings': {
                'bitRate': settings.bitRate,
                'audioFileTypeActions': settings.audioFileTypeActions
            },
            'sourceFolder': this.#sourceFolderPath,
            'targetFolder': this.#targetFolderPath,
            'status': this.#fileStatus,
            'errors': this.#errors
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

            ProgressMessage.send(`Syncing Playlist "${path.basename(playlistSourceFilePath)}" to Target Folder`);

            const playlist = new Playlist(playlistSourceFilePath, targetFolder);

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

    #syncPlaylist(playlistSourceFilePath, metadata, settings) {
        const playlist = new Playlist(playlistSourceFilePath, this.#targetFolderPath);

        let success;

        try {
            playlist.write(metadata, this.#recordError, settings);
            success = true;
        } catch (err) {
            success = false;
        } finally {
            this.#recordStatus(playlistSourceFilePath, playlist.getTargetFilePath(), success);
        }
    }

    async #syncPlaylistAudioFiles(playlistSourceFilePath, metadata, settings, musicFolderPath, pool, callback) {
        const getTargetFilePath = this.#getTargetFilePath.bind(this);
        const copyFile = this.#copyFile.bind(this);
        const log = this.#logFile.write.bind(this.#logFile);

        const playlist = new Playlist(playlistSourceFilePath, this.#targetFolderPath);

        const audioFilePaths = playlist.getAudioFilePaths();

        audioFilePaths
            .filter(sourceFilePath => AudioFileUtils.shouldCopyAsIs(settings, sourceFilePath))
            .forEach(sourceFilePath => {
                Cancel.checkForCancellation();

                const audioFileMetadata = metadata.audioFilePathToMetadata[sourceFilePath];

                const targetFolder = path.join(musicFolderPath, Hash.generateHash(audioFileMetadata.common.album));
                const targetFileType = path.extname(sourceFilePath).slice(1);
                const targetFilePath = getTargetFilePath(targetFolder, sourceFilePath, targetFileType);

                ProgressMessage.send(`Copying file "${sourceFilePath}" to "${targetFilePath}"`);

                if (!fs.existsSync(targetFolder)) {
                    fs.mkdirSync(targetFolder);
                }

                copyFile(sourceFilePath, targetFilePath, callback);
            });

        audioFilePaths
            .filter(sourceFilePath => AudioFileUtils.shouldTranscode(settings, sourceFilePath))
            .forEach(sourceFilePath => {
                Cancel.checkForCancellation();

                const audioFileMetadata = metadata.audioFilePathToMetadata[sourceFilePath];

                const result = TranscoderCommand.createCommand(musicFolderPath, sourceFilePath,
                    audioFileMetadata.common.album, settings.bitRate);

                const targetFolder = path.dirname(result.targetFilePath);

                if (!fs.existsSync(targetFolder)) {
                    fs.mkdirSync(targetFolder);
                }

                pool.add(() => CommandProcessor.execShellCommand(result.command, sourceFilePath, result.targetFilePath,
                    callback, log))
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

                    ProgressMessage.send(`Copying file "${sourceFilePath}" to "${targetFilePath}"`);

                    copyFile(sourceFilePath, targetFilePath, callback);
                }
            });
    }

    #prepareToSyncTranscodableAudioFiles(pool, targetFolder, audioFilePathToMetadata, callback) {
        const log = this.#logFile.write.bind(this.#logFile);

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
            this.#logFile.write(`ERROR: ${err}`);
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
        this.#errors.push(error);
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

            this.#totalBytesSynced += targetFileStat.size;
        } catch (err) {
            console.error(err);
        }

        this.#fileStatus[targetFilePath] = {
            sourceFilePath,
            sourceFileStat,
            targetFileStat,
            success
        };

        const numberOfItems = Object.keys(this.#fileStatus).length;
        const gbsSynced = this.#totalBytesSynced / Constants.GB;

        if (this.totalItemsToProcess !== undefined) {
            const percentComplete = numberOfItems * 100.0 / this.totalItemsToProcess;

            ProgressMessage.send(
                undefined,
                `${numberOfItems.toLocaleString()} of ${this.totalItemsToProcess.toLocaleString()} items processed, ${gbsSynced.toFixed(2)} GBs synced`, percentComplete);
        } else {
            const percentComplete = Math.min(
                100.0,
                (this.#totalBytesSynced / (this.#maxGBToSync * Constants.GB)) * 100.0);

            ProgressMessage.send(
                undefined,
                `${numberOfItems.toLocaleString()} items processed, ${gbsSynced.toFixed(2)} GBs synced`,
                percentComplete);
        }
    }

    #displayStatus(metadata) {
        ProgressMessage.send('Writing log entries');

        const log = this.#logFile.write.bind(this.#logFile);

        log('\r\ndisplayStatus:');

        log(`\r\nPlaylists: ${metadata.playlistFilePaths.length}`);

        const albums = {};

        Object.entries(metadata.audioFilePathToMetadata).forEach(function([, item]) {
            albums[item.common.album] = true;
        });

        log(`Albums: ${Object.keys(albums).length}`);
        log(`Tracks: ${Object.keys(metadata.audioFilePathToMetadata).length}`);

        let successes = 0;
        let failures = 0;

        Object.entries(this.#fileStatus).forEach(function([, {success}]) {
            if (success) {
                successes++;
            } else {
                failures++;
            }
        });

        log(`\r\n\r\ntotal files processed (playlists + tracks): ${successes + failures}\r\n\r\nsuccesses: ${successes}\r\nfailures: ${failures}\r\n`);

        log('\r\nsuccesses:\r\n');

        Object.entries(this.#fileStatus).forEach(function([key, {sourceFilePath, success}]) {
            if (success) {
                log(`sourceFilePath: "${sourceFilePath}" targetFilePath: "${key}"`);
            }
        });

        log('\r\nfailures:\r\n');

        Object.entries(this.#fileStatus).forEach(function([key, {sourceFilePath, success}]) {
            if (!success) {
                log(`sourceFilePath: "${sourceFilePath}" targetFilePath: "${key}"`);
            }
        });

        log('\r\n\r\nErrors:\r\n\r\n');

        this.#errors.forEach(error => {
            log(`Error: ${error}`);
        })
    }

    #audits(metadata) {
        ProgressMessage.send('Writing audit results to log');

        const log = this.#logFile.write.bind(this.#logFile);

        log('\r\nAudits:');

        const auditFunctions = [
            Audits.sourcePlaylistTracksDoNotExist,
            Audits.targetPlaylistTracksDoNotExist,
            Audits.tracksNotInPlaylists,
            Audits.sourceMediaNotInTargetFolder,
            Audits.sourcePlaylistTracksOutOfOrder
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
