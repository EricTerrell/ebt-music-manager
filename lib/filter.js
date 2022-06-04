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

const path = require('path');

const StringLiterals = require('./stringLiterals');

module.exports = class Filter {
    static filterPlaylists(metadata, filterSettings) {
        return this._filterPlaylistsOrAlbums(metadata.playlists, metadata, filterSettings,
            (element) => path.basename(element[0], `.${StringLiterals.PLAYLIST_FILE_TYPE}`));
    }

    static filterAlbums(metadata, filterSettings) {
        return this._filterPlaylistsOrAlbums(metadata.albums, metadata, filterSettings,
            (element) => element[0]);
    }

    static _filterPlaylistsOrAlbums(list, metadata, filterSettings, processElement) {
        const results = [];

        Object.entries(list)
            .forEach((element) => {
                for (const audioFileInfo of element[1]) {
                    const filterData = {
                        name: processElement(element),
                        tracks: this._getTracks(element[1], metadata)
                    };

                    if (this._evaluateFilter(filterSettings, filterData)) {
                        results.push(element[0]);
                        break;
                    }
                }
            });

        return results;
    }

    static filterTracks(metadata, filterSettings) {
        const results = [];

        Object.entries(metadata.audioFilePathToMetadata)
            .forEach((element) => {
                const filterData = {
                    name: element[0],
                    tracks: this._getTracks([ { audioFilePath: element[0] } ], metadata)
                };

                if (this._evaluateFilter(filterSettings, filterData)) {
                    results.push({
                        audioFilePath: element[0],
                        metadata: element[1]
                    });
                }
            });

        return results;
    }

    static _evaluateFilter(filterSettings, filterData) {
        let fieldValues = this._getValues(filterSettings.fieldName, filterData);
        let text = filterSettings.text;

        const handleCase = (s) => filterSettings.ignoreCase ? s.toUpperCase() : s;

        const operationToFunction = {
            'contains': s => handleCase(s).includes(handleCase(text)),
            'equals': s => handleCase(s) === handleCase(text),
            'ne': s => handleCase(s) !== handleCase(text),
            'gt': s => handleCase(s) > handleCase(text),
            'ge': s => handleCase(s) >= handleCase(text),
            'lt': s => handleCase(s) < handleCase(text),
            'le': s => handleCase(s) <= handleCase(text)
        };

        const operationFunction = operationToFunction[filterSettings.operation];

        return !filterSettings.filter || fieldValues.filter(operationFunction).length > 0;
    }

    static _getValues(fieldName, filterData) {
        const fieldNameToFunction = {
            playlistAlbumName: filterData => [filterData.name],
            album: filterData => filterData.tracks.map(element => this._formatData(element.metadata?.common?.album)),
            albumArtist: filterData => filterData.tracks.map(element =>
                this._formatData(element.metadata?.common?.albumartist)),
            artist: filterData => filterData.tracks.map(element => this._formatData(element.metadata?.common?.artist)),
            composer: filterData => filterData.tracks.map(element =>
                this._formatData(element.metadata?.common?.composer)),
            date: filterData => filterData.tracks.map(element => this._formatData(element.metadata?.common?.date)),
            filePath: filterData => filterData.tracks.map(element => this._formatData(element.audioFilePath)),
            genre: filterData => filterData.tracks.map(element => this._formatData(element.metadata?.common?.genre)),
            title: filterData => filterData.tracks.map(element => this._formatData(element.metadata?.common?.title)),
            modified: filterData => filterData.tracks
                .map(element => this._formatData(element.metadata?.mtimeMsHumanReadable))
        }

        const fcn = fieldNameToFunction[fieldName];

        return fcn(filterData);
    }

    static _getTracks(trackPaths, metadata) {
        return Object.values(trackPaths)
            .map(value => {
                const audioFilePath = value.audioFilePath;
                const trackMetadata = metadata.audioFilePathToMetadata[audioFilePath];

                return {
                    audioFilePath,
                    metadata: trackMetadata
                };
            });
    }

    static _formatData(data) {
        return data !== undefined ? data.toString() : StringLiterals.EMPTY_STRING;
    }
};
