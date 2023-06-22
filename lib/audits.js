/*
  EBT Music Manager
  (C) Copyright 2023, Eric Bergman-Terrell

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
    static sourcePlaylistTracksDoNotExist(metadata, contentToSync) {
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

    static tracksNotInPlaylists(metadata, contentToSync) {
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

    static sourceMediaNotInTargetFolder(metadata, contentToSync) {
        const playlistsNotFound =
            Array.from(contentToSync.targetPaths.playlists)
                .filter(playlistSourceFilePath => !fs.existsSync(playlistSourceFilePath))
                .map(playlistSourcePath => `Playlist "${playlistSourcePath}" not found`);

        const tracksNotFound =
            Array.from(contentToSync.targetPaths.tracks)
                .filter(trackSourceFilePath => !fs.existsSync(trackSourceFilePath))
                .map(trackSourcePath => `Track "${trackSourcePath}" not found`);

        return {
            header: 'Source Media Not In Target Folder',
            lines: playlistsNotFound.concat(tracksNotFound)
        };
    }

    static targetPlaylistTracksDoNotExist(metadata, contentToSync) {
        const playlistPaths = [];

        Array.from(metadata.targetPathToSourcePath)
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
            .map(element => `Track "${element[1]}" referenced in playlist "${element[0]}" does not exist\r\n`);

        return {
            header: 'Target Playlist Tracks Do Not Exist',
            lines
        };
    }

    static sourcePlaylistTracksOutOfOrder(metadata, contentToSync) {
        console.log(`sourcePlaylistTracksOutOfOrder`);

        const lines = [];

        Object
            .entries(metadata.playlists)
            .map(entry => {
                const playlistPath = entry[0];
                const playlistTracks = entry[1];

                const sequence = [];

                playlistTracks.map(playlist => {
                    const audioFilePath = playlist.audioFilePath;
                    const trackMetadata = metadata.audioFilePathToMetadata[audioFilePath];

                    sequence.push({
                        discNumber: trackMetadata?.common?.disk?.no,
                        trackNumber: trackMetadata?.common?.track?.no
                    })
                });

                const originalSequence = [...sequence];
                const sortedSequence = sequence.sort(Audits.#compareSequence);

                for (let i = 0; i < originalSequence.length; i++) {
                    if (originalSequence[i].discNumber !== sortedSequence[i].discNumber ||
                        originalSequence[i].trackNumber !== sortedSequence[i].trackNumber) {
                        lines.push(`Playlist "${playlistPath}": item ${i + 1} playlist order does not match metadata discNumber: ${originalSequence[i].discNumber} trackNumber: ${originalSequence[i].trackNumber}`);
                    }
                }
            });

        return {
            header: 'Source Playlist Tracks Out of Order',
            lines
        };
    }

    static #compareSequence(a, b) {
        if (a.discNumber === b.discNumber) {
            return a.trackNumber - b.trackNumber;
        } else {
            return a.discNumber - b.discNumber;
        }
    }
};
