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

const StringLiterals = require('./stringLiterals');
const Playlist = require('./playlist');

module.exports = class Audits {
    static sourcePlaylistTracksDoNotExist(metadata) {
        const lines = Object
            .entries(metadata.playlists)
            .flatMap(entry => entry[1].map(x => [entry[0], x.audioFilePath]))
            .filter(item => !fs.existsSync(item[1]))
            .map(item => `Playlist "${item[0]}": Track "${item[1]}" does not exist\r\n`);

        return {
            header: 'Source Playlist Tracks Do Not Exist',
            lines
        };
    }

    static tracksNotInPlaylists(metadata) {
        const tracks = Object
            .entries(metadata.audioFilePathToMetadata)
            .map(element => element[0]);

        const tracksInPlaylistsDictionary = {};

        Object
            .entries(metadata.playlists)
            .flatMap(entry => entry[1].map(x => [entry[0], x.audioFilePath]))
            .forEach(item => {
                tracksInPlaylistsDictionary[item[1]] = true;
            });

        const lines = Object
            .values(tracks)
            .filter(track => tracksInPlaylistsDictionary[track] === undefined)
            .map(track => `"${track}"\r\n`);

        return {
            header: 'Tracks Not In Any Playlist',
            lines
        };
    }

    static sourceMediaNotInTargetFolder(metadata) {
        const sourcePathToTargetPath = {};

        Object
            .entries(metadata.targetPathToSourcePath)
            .forEach(element => {
                sourcePathToTargetPath[element[1]] = element[0];
            });

        const playlistsNotFound =
            Object
                .entries(metadata.playlistFilePaths)
                .map(entry => entry[1])
                .filter(playlistSourcePath => sourcePathToTargetPath[playlistSourcePath] === undefined)
                .map(playlistSourcePath => `Playlist "${playlistSourcePath}" not found`);

        const tracksNotFound =
            Object
                .entries(metadata.audioFilePathToMetadata)
                .map(entry => entry[0])
                .filter(trackSourcePath => sourcePathToTargetPath[trackSourcePath] === undefined)
                .map(trackSourcePath => `Track "${trackSourcePath}" not found`);

        const mediaFilesDoNotExist =
            Object
                .entries(sourcePathToTargetPath)
                .filter(entry => !fs.existsSync(entry[1]))
                .map(entry => `Source media file "${entry[0]}" with target path "${entry[1]}" not found`);

        return {
            header: 'Source Media Not In Target Folder',
            lines: playlistsNotFound.concat(tracksNotFound, mediaFilesDoNotExist)
        };
    }

    static targetPlaylistTracksDoNotExist(metadata) {
        const playlistPaths = [];

        Object
            .entries(metadata.targetPathToSourcePath)
            .filter(entry => entry[0].endsWith(StringLiterals.PLAYLIST_FILE_TYPE))
            .map(entry => {
                const playlist = new Playlist(entry[0], null);

                for (const relativePath of playlist.getAudioFilePaths()) {
                    console.log(relativePath);

                    const folder = path.dirname(playlist.sourceFilePath);
                    console.log(folder);

                    const absolutePath = path.resolve(folder, relativePath);
                    playlistPaths.push([playlist.sourceFilePath, absolutePath]);
                }
            });

        const lines = playlistPaths
            .filter(element => !fs.existsSync(element[1]))
            .map(element => `Track "${element[1]}" referenced in playlist "${element[0]}" does not exist`);

        return {
            header: 'Target Playlist Tracks Do Not Exist',
            lines
        };
    }
};
