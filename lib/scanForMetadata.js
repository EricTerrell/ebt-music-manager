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
const path = require("path");

const {pd: prettyData} = require("pretty-data");
const musicMetadata = require('music-metadata');

const Hash = require('../lib/hash');
const FileSystemUtils = require('../lib/fileSystemUtils');
const StringLiterals = require('../lib/stringLiterals');
const Playlist = require('../lib/playlist');
const Cancel = require('../lib/cancel');
const Constants = require("./constants");
const ProgressMessage = require('./progressMessage');
const {DateTime} = require("luxon");

module.exports = class ScanForMetadata {
    static _SUPPORTED_FILE_TYPES = {};

    static {
        this._SUPPORTED_FILE_TYPES[StringLiterals.FLAC_FILE_TYPE] = true;
        this._SUPPORTED_FILE_TYPES[StringLiterals.MP3_FILE_TYPE] = true;
    }

    static async scan(sourceFolderPath, targetFolderPath, cachedAudioFilePathToMetadata = undefined) {
        console.log(`Scan "${sourceFolderPath}"\r\n`);

        Cancel.reset();

        const audioFilePaths = [];
        const playlistFilePaths = [];
        await this._scanFolder(sourceFolderPath, audioFilePaths, playlistFilePaths);

        const audioFilePathToMetadata = await this._retrieveAudioFileMetadata(audioFilePaths, cachedAudioFilePathToMetadata);

        return this.buildScanResults(playlistFilePaths, audioFilePathToMetadata, sourceFolderPath, targetFolderPath);
    }

    static buildScanResults(playlistFilePaths, audioFilePathToMetadata, sourceFolderPath, targetFolderPath) {
        console.log('buildScanResults: getAlbums');
        const albums = this._getAlbums(audioFilePathToMetadata);

        console.log('buildScanResults: getPlaylists');
        const playlists = this._getPlaylists(playlistFilePaths);

        console.log('buildScanResults: _getSourcePathToTargetPath');
        const targetPathToSourcePathAudioFiles = this._getSourcePathToTargetPath(audioFilePathToMetadata,
            targetFolderPath);

        console.log('buildScanResults: _getPlaylistSourcePathToTargetPath');
        const targetPathToSourcePathPlaylists = this._getPlaylistSourcePathToTargetPath(playlistFilePaths,
            targetFolderPath);

        return {
            sourceFolderPath,

            targetFolderPath,

            playlistFilePaths,

            audioFilePathToMetadata,

            albums,

            'targetPathToSourcePath': Object.assign({},
                targetPathToSourcePathAudioFiles, targetPathToSourcePathPlaylists),

            playlists
        };
    }

    static async _retrieveAudioFileMetadata(audioFilePaths, cachedAudioFilePathToMetadata) {
        const result = {};

        for (const audioFilePath of audioFilePaths) {
            Cancel.checkForCancellation();

            result[audioFilePath] = await this.retrieveMetadata(audioFilePath, cachedAudioFilePathToMetadata);
        }

        return result;
    }

    static _getPlaylists(playlistFilePaths) {
        const playlists = {};

        playlistFilePaths.forEach(playlistFilePath => {
            const playlist = new Playlist(playlistFilePath, null);

            let playlistPosition = 1;

            playlists[playlistFilePath] =
                playlist.getAudioFilePaths()
                    .filter(trackFilePath => fs.existsSync(trackFilePath))
                    .map(trackFilePath => ({
                            'audioFilePath': trackFilePath,
                            'playlistPosition': playlistPosition++
                        }));
        });

        return playlists;
    }

    static _getSourcePathToTargetPath(audioFilePathToMetadata, targetFolderPath) {
        const result = {};

        Object.entries(audioFilePathToMetadata).forEach(function([sourceFilePath, metadata]) {
            const targetFolder = path.join(targetFolderPath, StringLiterals.MUSIC_TARGET_FOLDER,
                Hash.generateHash(metadata.common.album));
            const sourceFileType = path.extname(sourceFilePath);
            const targetFileName = `${path.basename(sourceFilePath, sourceFileType)}`;
            const targetFilePath = `${path.join(`${targetFolder}`, Hash.generateHash(targetFileName))}.${StringLiterals.MP3_FILE_TYPE}`;

            result[targetFilePath] = sourceFilePath;
        });

        return result;
    }

    static _getPlaylistSourcePathToTargetPath(sourceFilePaths, targetFolderPath) {
        const result = {};

        sourceFilePaths.forEach(sourceFilePath => {
            const targetFileName = `${path.basename(sourceFilePath, StringLiterals.PLAYLIST_FILE_TYPE)}`;
            const targetFilePath = `${path.join(`${targetFolderPath}`, StringLiterals.PLAYLISTS_TARGET_FOLDER, 
                targetFileName)}${StringLiterals.PLAYLIST_FILE_TYPE}`;

            result[targetFilePath] = sourceFilePath;
        });

        return result;
    }

    static async _scanFolder(folderPath, audioFilePaths, playlistFilePaths) {
        Cancel.checkForCancellation();

        const items = Object.keys(FileSystemUtils.getAllFilePaths(folderPath));

        for (const item of items) {
            Cancel.checkForCancellation();

            const m3uFileType = `.${StringLiterals.PLAYLIST_FILE_TYPE}`;

            if (item.toLowerCase().endsWith(m3uFileType)) {
                ProgressMessage.send(`Scanning ${item}`);

                playlistFilePaths.push(item);
            } else if (this._isAudioFile(item)) {
                ProgressMessage.send(`Scanning ${item}`);

                audioFilePaths.push(item);
            }
        }
    }

    static async retrieveMetadata(filePath, cachedAudioFilePathToMetadata = undefined) {
        let metadata = null;

        try {
            const options = {
                'duration': false,
                'skipCovers': true
            };

            ProgressMessage.send(`Extracting metadata from ${filePath}`);

            const statResult = this._getStatResult(filePath);

            let cachedMetadata = undefined;

            if (cachedAudioFilePathToMetadata !== undefined) {
                cachedMetadata = cachedAudioFilePathToMetadata[filePath];
            }

            if (cachedMetadata !== undefined && cachedMetadata.mtimeMs === statResult.mtimeMs) {
                metadata = cachedMetadata;
            } else {
                metadata = await musicMetadata.parseFile(filePath, options);
            }

            metadata.mtimeMs = statResult.mtimeMs;
            metadata.mtimeMsHumanReadable = DateTime.fromJSDate(new Date(statResult.mtimeMs))
                .toFormat(StringLiterals.COLUMN_DATETIME_FORMAT);
        } catch (e) {
            console.log(`***** CANNOT PARSE ${filePath}: ${e} *****`);
        }

        return metadata;
    }

    static _getStatResult(filePath) {
        return fs.statSync(filePath, { 'bigint': false })
    }

    static _isAudioFile(filePath) {
        const index = filePath.lastIndexOf('.');

        if (index === -1) {
            return false;
        }

        const fileType = filePath.substring(index + 1).toLowerCase();

        return this._SUPPORTED_FILE_TYPES[fileType];
    }

    static _getAlbums(audioFilePathToMetadata) {
        let albums = {};

        Object.entries(audioFilePathToMetadata)
            .forEach(function([audioFilePath, metadata]) {
            const key = metadata.common.album;

            let array = albums[key];

            if (array === undefined) {
                array = [];

                albums[key] = array;
            }

            array.push({ audioFilePath });
        });

        return albums;
    }

    static readMetadata(targetFolderPath) {
        console.log(`ScanForMetadata.readMetadata: "${targetFolderPath}"`);

        const metadataFilePath = path.join(targetFolderPath, StringLiterals.METADATA_FILENAME);

        try {
            const metadataJSON = fs.readFileSync(metadataFilePath, Constants.READ_WRITE_FILE_OPTIONS).toString();

            return JSON.parse(metadataJSON);
        } catch (err) {
            console.error(err);

            return undefined;
        }
    }

    static writeMetadata(metadata, targetFolderPath) {
        if (!fs.existsSync(targetFolderPath)) {
            fs.mkdirSync(targetFolderPath, { recursive: true });
        }

        const metadataFilePath = path.join(targetFolderPath, StringLiterals.METADATA_FILENAME);
        fs.writeFileSync(metadataFilePath, prettyData.json(JSON.stringify(metadata)),
            Constants.READ_WRITE_FILE_OPTIONS);
    }

    static deletePlaylist(playlistPath, metadata) {
        console.log(`ScanForMetadata.deletePlaylist: playlistPath: "${playlistPath}"`);

        metadata.playlistFilePaths = metadata.playlistFilePaths.filter(element => element !== playlistPath);

        if (metadata.playlists[playlistPath] !== undefined) {
            delete metadata.playlists[playlistPath];
        }
    }

    static renamePlaylist(oldPlaylistPath, newPlaylistPath, metadata) {
        console.log(`ScanForMetadata.renamePlaylist: oldPlaylistPath: "${oldPlaylistPath}" newPlaylistPath: "${newPlaylistPath}"`);

        metadata.playlistFilePaths = metadata.playlistFilePaths.filter(element => element !== oldPlaylistPath);
        metadata.playlistFilePaths.push(newPlaylistPath);

        if (metadata.playlists[oldPlaylistPath] !== undefined) {
            metadata.playlists[newPlaylistPath] = metadata.playlists[oldPlaylistPath];
        }
    }

    static upsertPlaylist(newPlaylistPath, metadata) {
        console.log(`upsertPlaylist: "${newPlaylistPath}"`);

        if (metadata.playlists[newPlaylistPath] !== undefined) {
            this.deletePlaylist(newPlaylistPath, metadata);
        }

        metadata.playlistFilePaths.push(newPlaylistPath);

        metadata.playlists[newPlaylistPath] = this._getPlaylists([newPlaylistPath]);
    }

    static deleteTrackReferences(trackPath, metadata) {
        console.log(`ScanForMetadata.deleteTrackReferences: trackPath: "${trackPath}"`);

        // Delete references to the track in any playlist in metadata
        (Object.entries(metadata.playlists)).forEach(([key, value]) => {
            const originalItemCount = metadata.playlists[key].length;

            metadata.playlists[key] = value.filter(element => element.audioFilePath !== trackPath);

            const newItemCount = metadata.playlists[key].length;

            // If playlist changed, rewrite it.
            if (newItemCount !== originalItemCount) {
                Playlist.rewrite(metadata.playlists[key].map(x => x.audioFilePath), key);
            }
        });
    }

    static deleteTrack(trackPath, metadata) {
        console.log(`ScanForMetadata.deleteTrack: trackPath: "${trackPath}"`);

        // Delete track from metadata
        if (metadata.audioFilePathToMetadata[trackPath] !== undefined) {
            delete metadata.audioFilePathToMetadata[trackPath];
        }

        // Delete track references from playlists
        this.deleteTrackReferences(trackPath, metadata);
    }
};
