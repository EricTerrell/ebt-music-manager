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
const PromisePool = require('async-promise-pool');
const CommandProcessor = require('../lib/commandProcessor');
const TranscoderCommand = require('../lib/transcoderCommand');
const Files = require('../lib/files');
const AudioFileUtils = require('../lib/audioFileUtils');
const LogFile = require('../lib/logFile');
const ScanForMetadata = require('../lib/scanForMetadata');
const Playlist = require('../lib/playlist');
const StringLiterals = require('../lib/stringLiterals');
const Constants = require('../lib/constants');
const FileSystemUtils = require('../lib/fileSystemUtils');
const Cancel = require('../lib/cancel');
const ProgressMessage = require('../lib/progressMessage');
const Audits = require('../lib/audits');
const SyncStatus = require('../lib/syncStatus');

module.exports = class Sync {
    #totalBytesSynced;
    #sourceFolderPath;
    #targetFolderPath;
    #settings;
    #metadata;
    #syncStatus;
    #fileStatus;
    #errors;
    #logFile;
    #previousRunStatus;
    #maxGBToSync;
    #pool;
    #content;
    #contentToSync;

    constructor(sourceFolderPath, targetFolderPath, syncStatus) {
        this.#sourceFolderPath = sourceFolderPath;
        this.#targetFolderPath = targetFolderPath;
        this.#syncStatus = syncStatus;

        this.#settings = Files.getSettings();

        this.#fileStatus = {};
        this.#errors = [];

        this.#pool = undefined;

        const logFilePath = path.join(this.#targetFolderPath, StringLiterals.LOG_FILENAME);
        this.#logFile = new LogFile(logFilePath, true);
    }

    async sync(cachedAudioFilePathToMetadata = undefined) {
        const startTime = new Date();

        this.#totalBytesSynced = 0;

        ProgressMessage.send(`Syncing target folder "${this.#targetFolderPath}" from source folder "${this.#sourceFolderPath}"`);

        this.#createTargetFolder();

        this.#logFile.write(`sync: starting at ${startTime}\r\n`);

        this.#previousRunStatus = this.#getPreviousRunStatus();

        this.#metadata = await ScanForMetadata.scan(this.#sourceFolderPath, this.#targetFolderPath,
            cachedAudioFilePathToMetadata);

        Cancel.checkForCancellation();

        this.#content = this.#getContent(false);
        this.#contentToSync = this.#getContent(true);

        const musicFolderPath = path.join(this.#targetFolderPath, StringLiterals.MUSIC_TARGET_FOLDER);

        this.#deleteObsoleteFiles(musicFolderPath);

        Cancel.checkForCancellation();

        /*
        Write metadata.json and sync-status.dat *after* call to deleteObsoleteContent which can remove entire target
        folder.
        */
        ScanForMetadata.writeMetadata(this.#metadata, this.#targetFolderPath);
        SyncStatus.save(this.#syncStatus);

        Cancel.checkForCancellation();

        this.#writeStatus();

        Cancel.checkForCancellation();

        this.totalItemsToProcess = this.#totalItemsToProcess();

        this.#logFile.write(`\r\nTotal Items to Process: ${this.totalItemsToProcess.toLocaleString()}\r\n`);

        this.#createMusicFolders(musicFolderPath);

        Cancel.checkForCancellation();

        this.#syncPlaylists(this.#recordError.bind(this), this.#recordStatus.bind(this));

        Cancel.checkForCancellation();

        // Copy audio files that don't need to be transcoded
        this.#syncNonTranscodableAudioFiles(musicFolderPath, this.#recordStatus.bind(this));

        Cancel.checkForCancellation();

        // Transcode audio files that need to be transcoded
        this.#pool = new PromisePool({ concurrency: this.#settings.concurrency });

        this.#prepareToSyncTranscodableAudioFiles(this.#recordStatus.bind(this));

        Cancel.checkForCancellation();

        await this.#pool.all();
        this.#pool = undefined;

        this.#deleteEmptyAlbumFolders(musicFolderPath);
        Cancel.checkForCancellation();

        this.#verifyResults();

        Cancel.checkForCancellation();

        this.#displayStatus();

        Cancel.checkForCancellation();

        this.#audits();

        Cancel.checkForCancellation();

        this.#finishSync(startTime);

        return this.#metadata;
    }

    #getContent(onlyContentToSync) {
        const contentToSync = {
            sourcePaths: {
                playlists: new Set(),
                tracks: new Set()
            },

            targetPaths: {
                playlists: new Set(),
                tracks: new Set(),

                musicFolders: new Set()
            }
        };

        let playlists =
            Object.keys(this.#syncStatus.playlists)
                .filter(sourceFilePath => this.#syncStatus.playlists[sourceFilePath] === true);

        if (onlyContentToSync) {
            playlists = playlists.filter(sourceFilePath =>
                AudioFileUtils.shouldUpdate(this.#metadata, this.#settings, sourceFilePath, this.#targetFolderPath));
        }

        playlists.forEach(sourceFilePath => contentToSync.sourcePaths.playlists.add(sourceFilePath));
        playlists.forEach(sourceFilePath => contentToSync.targetPaths.playlists.add(
            AudioFileUtils.getTargetFilePath(this.#metadata, this.#settings, sourceFilePath, this.#targetFolderPath)));

        const tracks = Object.keys(this.#syncStatus.tracks)
            .filter(sourceFilePath => this.#syncStatus.tracks[sourceFilePath] === true);

        const playlistTracks = Object.keys(this.#metadata.playlists)
            .filter(sourceFilePath => this.#syncStatus.playlists[sourceFilePath] === true)
            .map(sourceFilePath => this.#metadata.playlists[sourceFilePath])
            .flat()
            .map(obj => obj.audioFilePath);

        const albumTracks = Object.keys(this.#metadata.albums)
            .filter(album => this.#syncStatus.albums[album] === true)
            .map(album => this.#metadata.albums[album])
            .flat()
            .map(obj => obj.audioFilePath);

        let allTracks = tracks.concat(playlistTracks, albumTracks);

        if (onlyContentToSync) {
            allTracks = allTracks.filter(sourceFilePath =>
                AudioFileUtils.shouldUpdate(this.#metadata, this.#settings, sourceFilePath, this.#targetFolderPath,
                    AudioFileUtils.shouldCopyAsIs(this.#settings, sourceFilePath)));
        }

        allTracks.forEach(sourceFilePath => {
            contentToSync.sourcePaths.tracks.add(sourceFilePath);

            const targetFilePath = AudioFileUtils.getTargetFilePath(this.#metadata, this.#settings,
                sourceFilePath, this.#targetFolderPath);

            contentToSync.targetPaths.tracks.add(targetFilePath);

            contentToSync.targetPaths.musicFolders.add(path.dirname(targetFilePath));
        });

        if (onlyContentToSync) {
            /*
            For each track being synced, the corresponding playlist must also be synced. Reason: The track's album
            may have been changed without the playlist(s) referencing the track being changed.
             */

            const sourceTrackToSourcePlaylist = {};

            Object.entries(this.#metadata.playlists).forEach(([playlistSourceFilePath, value]) => {
                value.forEach(element => {
                    sourceTrackToSourcePlaylist[element.audioFilePath] = playlistSourceFilePath;
                });
            });

            Array.from(contentToSync.sourcePaths.tracks).forEach(trackSourceFilePath => {
                const playlistSourceFilePath = sourceTrackToSourcePlaylist[trackSourceFilePath];

                if (playlistSourceFilePath !== undefined) {
                    contentToSync.sourcePaths.playlists.add(playlistSourceFilePath);

                    const playlistTargetFilePath = AudioFileUtils.getTargetFilePath(this.#metadata, this.#settings,
                        playlistSourceFilePath, this.#targetFolderPath);

                    contentToSync.targetPaths.playlists.add(playlistTargetFilePath);
                }
            });
        }

        return contentToSync;
    }

    #finishSync(startTime) {
        this.#logFile.write(`\r\nsync: total size synced: ${this.#totalBytesSynced.toLocaleString()}\r\n`);

        const stopTime = new Date();
        const elapsedMinutes = (stopTime - startTime) / (1000.0 * 60.0);

        ProgressMessage.send(`Sync completed\\r\\n\\r\\n${stopTime}\\r\\n\\r\\nElapsed Minutes: ${elapsedMinutes.toFixed(2)}`, undefined,100.0, true);

        this.#logFile.write(`\r\nSync completed at ${stopTime}\r\n\r\nElapsed Minutes: ${elapsedMinutes.toFixed(2)}\r\n`);
    }

    async cleanup() {
        this.#logFile.write('\nSync.cleanup started\n');

        if (this.#pool !== undefined) {
            this.#logFile.write('\nawait\n');

            try {
                await this.#pool.all();
            } catch (err) {
                console.error(err);
            }

            this.#pool = undefined;

            this.#logFile.write('\nawait finished\n');
        }

        this.#logFile.write('\nSync.cleanup finished\n');
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

    #totalItemsToProcess() {
        return this.#contentToSync.targetPaths.playlists.size + this.#contentToSync.targetPaths.tracks.size;
    }

    #createTargetFolder() {
        FileSystemUtils.mkdir(this.#targetFolderPath);
    }

    #deleteObsoleteFiles(musicFolderPath) {
        const previousAudioFileTypeActions = JSON.stringify(this?.#previousRunStatus?.settings?.audioFileTypeActions);
        const currentAudioFileTypeActions = JSON.stringify(this.#settings.audioFileTypeActions);

        if (this.#previousRunStatus === null ||
            this.#previousRunStatus.sourceFolder !== this.#sourceFolderPath ||
            this.#previousRunStatus.targetFolder !== this.#targetFolderPath ||
            this.#settings.bitRate !== this.#previousRunStatus.settings.bitRate ||
            currentAudioFileTypeActions !== previousAudioFileTypeActions) {
            this.#logFile.write(`\r\nDeleting all content in target folder (no previousRunStatus or settings changed)`);

            FileSystemUtils.removeFolder(this.#targetFolderPath);

            this.#createTargetFolder();
            FileSystemUtils.mkdir(musicFolderPath);
        } else {
            Object.keys(FileSystemUtils.getAllFilePaths(this.#targetFolderPath))
                .forEach(targetFilePath => {
                    Cancel.checkForCancellation();

                    this.#deleteObsoleteFile(targetFilePath);
                });
        }
    }

    #deleteObsoleteFile(targetFilePath) {
        if ((AudioFileUtils.isAudioFile(this.#settings, targetFilePath) || AudioFileUtils.isPlaylist(targetFilePath)) &&
            !this.#content.targetPaths.playlists.has(targetFilePath) &&
            !this.#content.targetPaths.tracks.has(targetFilePath)) {
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

    #deleteEmptyAlbumFolders(musicFolderPath) {
        Object.keys(FileSystemUtils.getAllFolderPaths(musicFolderPath))
            .forEach(folderPath => {
                Cancel.checkForCancellation();

                let numberOfFiles = 0;

                fs.readdirSync(folderPath, { withFileTypes: true }).forEach(item => {
                    if (item.isFile()) {
                        numberOfFiles++;
                    }
                });

                if (numberOfFiles === 0) {
                    FileSystemUtils.removeFolder(folderPath);
                }
            });
    }

    #verifyResults() {
        this.#logFile.write('\r\nVerify Results:\r\n');

        // Verify that all playlist entries point to files in the proper target folder directories.

        Array.from(this.#contentToSync.targetPaths.playlists)
            .forEach(playlistPath => {
                new Playlist(playlistPath, this.#targetFolderPath).verify(this.#metadata, this.#errors);
            });
    }

    #writeStatus() {
        const statusFilePath = path.join(this.#targetFolderPath, StringLiterals.TRANSCODING_STATUS_FILENAME);

        const data = {
            'settings': {
                'bitRate': this.#settings.bitRate,
                'audioFileTypeActions': this.#settings.audioFileTypeActions
            },
            'sourceFolder': this.#sourceFolderPath,
            'targetFolder': this.#targetFolderPath,
            'status': this.#fileStatus,
            'errors': this.#errors
        };

        fs.writeFileSync(statusFilePath, JSON.stringify(data), Constants.READ_WRITE_FILE_OPTIONS);
    }

    #createMusicFolders(musicFolderRootPath) {
        ProgressMessage.send('Creating Music Folders');

        FileSystemUtils.mkdir(musicFolderRootPath);

        Array.from(this.#contentToSync.targetPaths.musicFolders)
            .forEach(musicFolderPath => {
                FileSystemUtils.mkdir(musicFolderPath);

                Cancel.checkForCancellation();
            });
    }

    #syncPlaylists(recordErrorCallback, recordStatusCallback) {
        const playlistsFolderPath = path.join(this.#targetFolderPath, StringLiterals.PLAYLISTS_TARGET_FOLDER);

        FileSystemUtils.mkdir(playlistsFolderPath);

        this.#metadata.playlistFilePaths
            .filter(playlistSourceFilePath => this.#contentToSync.sourcePaths.playlists.has(playlistSourceFilePath))
            .forEach(playlistSourceFilePath => {
                Cancel.checkForCancellation();

                ProgressMessage.send(`Syncing Playlist "${path.basename(playlistSourceFilePath)}" to Target Folder`);

                const playlist = new Playlist(playlistSourceFilePath, this.#targetFolderPath);

                let success;

                try {
                    playlist.write(this.#metadata, recordErrorCallback, this.#settings);
                    success = true;
                } catch (err) {
                    success = false;
                } finally {
                    recordStatusCallback(playlistSourceFilePath, playlist.getTargetFilePath(), success);
                }
            });
    }

    #syncNonTranscodableAudioFiles(musicFolderPath, callback) {
        Object.entries(this.#metadata.audioFilePathToMetadata)
            .filter(([sourceFilePath]) => this.#contentToSync.sourcePaths.tracks.has(sourceFilePath))
            .filter(([sourceFilePath]) => AudioFileUtils.shouldCopyAsIs(this.#settings, sourceFilePath))
            .forEach(function ([sourceFilePath /*, metadata */]) {
                Cancel.checkForCancellation();

                const targetFilePath = AudioFileUtils.getTargetFilePath(this.#metadata, this.#settings, sourceFilePath,
                    this.#targetFolderPath);

                    ProgressMessage.send(`Copying file "${sourceFilePath}" to "${targetFilePath}"`);

                    this.#copyFile(sourceFilePath, targetFilePath, callback);
            }, this);
    }

    #prepareToSyncTranscodableAudioFiles(callback) {
        const log = this.#logFile.write.bind(this.#logFile);

        Object.entries(this.#metadata.audioFilePathToMetadata)
            .filter(([sourceFilePath]) => this.#contentToSync.sourcePaths.tracks.has(sourceFilePath))
            .filter(([sourceFilePath]) => AudioFileUtils.shouldTranscode(this.#settings, sourceFilePath))
            .forEach(function([sourceFilePath, metadata]) {
                Cancel.checkForCancellation();

                const result = TranscoderCommand.createCommand(this.#metadata, this.#settings, this.#targetFolderPath, sourceFilePath,
                    metadata.common.album, this.#settings.bitRate);

                this.#pool.add(() => CommandProcessor.execShellCommand(result.command, sourceFilePath, result.targetFilePath, callback, log))
        }, this);
    }

    #copyFile(sourceFilePath, targetFilePath, callback) {
        let success;

        try {
            fs.copyFileSync(sourceFilePath, targetFilePath);

            success = true;
        } catch (err) {
            this.#logFile.write(`ERROR: ${err}`);
            success = false;
        } finally {
            callback(sourceFilePath, targetFilePath, success);
        }
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

    #displayStatus() {
        ProgressMessage.send('Writing log entries');

        this.#logFile.write('\r\ndisplayStatus:');

        this.#logFile.write(`\r\nPlaylists: ${this.#metadata.playlistFilePaths.length}`);

        const albums = {};

        Object.entries(this.#metadata.audioFilePathToMetadata).forEach(function([, item]) {
            albums[item.common.album] = true;
        }, this);

        this.#logFile.write(`Albums: ${Object.keys(albums).length}`);
        this.#logFile.write(`Tracks: ${Object.keys(this.#metadata.audioFilePathToMetadata).length}`);

        let successes = 0;
        let failures = 0;

        Object.entries(this.#fileStatus).forEach(function([, {success}]) {
            if (success) {
                successes++;
            } else {
                failures++;
            }
        }, this);

        this.#logFile.write(`\r\n\r\ntotal files processed (playlists + tracks): ${successes + failures}\r\n\r\nsuccesses: ${successes}\r\nfailures: ${failures}\r\n`);

        this.#logFile.write('\r\nsuccesses:\r\n');

        Object.entries(this.#fileStatus).forEach(function([key, {sourceFilePath, success}]) {
            if (success) {
                this.#logFile.write(`sourceFilePath: "${sourceFilePath}" targetFilePath: "${key}"`);
            }
        }, this);

        this.#logFile.write('\r\nfailures:\r\n');

        Object.entries(this.#fileStatus).forEach(function([key, {sourceFilePath, success}]) {
            if (!success) {
                this.#logFile.write(`sourceFilePath: "${sourceFilePath}" targetFilePath: "${key}"`);
            }
        }, this);

        this.#logFile.write('\r\n\r\nErrors:\r\n\r\n');

        this.#errors.forEach(error => {
            this.#logFile.write(`Error: ${error}`);
        }, this)
    }

    #audits() {
        ProgressMessage.send('Writing audit results to log');

        this.#logFile.write('\r\nAudits:');

        const auditFunctions = [
            Audits.sourcePlaylistTracksDoNotExist,
            Audits.targetPlaylistTracksDoNotExist,
            Audits.sourceMediaNotInTargetFolder,
            Audits.sourcePlaylistTracksOutOfOrder,
            Audits.sourcePlaylistMultipleGenres,
            Audits.targetAlbumsHaveNoDiskOrTrackGaps
        ];

        auditFunctions.forEach(auditFunction => {
            const result = auditFunction(this.#metadata, this.#contentToSync);

            this.#logFile.write(`\r\n${result.header}:`);

            if (result.lines.length === 0) {
                this.#logFile.write('\tno issues');
            } else {
                let text = StringLiterals.EMPTY_STRING;

                result.lines.forEach(line => {
                    text += `\t${line}`;
                });

                this.#logFile.write(text);
            }
        }, this);
    }
};
