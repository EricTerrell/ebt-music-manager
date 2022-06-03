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

const expect = require('chai').expect;
const path = require('path');

const Filter = require('../lib/filter');
const ScanForMetadata = require('../lib/scanForMetadata');

describe("Filter tests", function () {
    const metadata = ScanForMetadata.readMetadata(path.join(__dirname, './resources'));

    it('should filter playlists', async function () {
        let filterSettings = {
            filter: true,
            fieldName: 'playlistAlbumName',
            operation: 'contains',
            text: 'Wagner',
            ignoreCase: false
        };

        let results = Filter.filterPlaylists(metadata, filterSettings);

        expect(results.length).to.equal(1);

        filterSettings = {
            filter: true,
            fieldName: 'playlistAlbumName',
            operation: 'equals',
            text: '10,000 Maniacs - Our Time In Eden',
            ignoreCase: false
        };

        results = Filter.filterPlaylists(metadata, filterSettings);

        expect(results.length).to.equal(1);
    });

    it('should filter by genre', async function () {
        const filterSettings = {
            filter: true,
            fieldName: 'genre',
            operation: 'equals',
            text: 'Rock',
            ignoreCase: false
        };

        const results = Filter.filterPlaylists(metadata, filterSettings);

        expect(results.length).to.equal(1);
    });

    it('should filter albums', async function() {
        let filterSettings = {
            filter: true,
            fieldName: 'playlistAlbumName',
            operation: 'contains',
            text: 'Maniacs',
            ignoreCase: false
        };

        let results = Filter.filterAlbums(metadata, filterSettings);

        expect(results.length).to.equal(2);
    });

    it('should filter tracks', async function () {
        let filterSettings = {
            filter: true,
            fieldName: 'playlistAlbumName',
            operation: 'contains',
            text: 'Eden',
            ignoreCase: false
        };

        let results = Filter.filterTracks(metadata, filterSettings);

        expect(results.length).to.equal(13);
    });

    it('should filter with >=', async function() {
        let filterSettings = {
            filter: true,
            fieldName: 'title',
            operation: 'ge',
            text: '10,000',
            ignoreCase: true
        };

        let results = Filter.filterTracks(metadata, filterSettings);

        expect(results.length).to.equal(65);

        filterSettings = {
            filter: true,
            fieldName: 'title',
            operation: 'ge',
            text: 'Wagner - Das Rheingold',
            ignoreCase: false
        };

        results = Filter.filterTracks(metadata, filterSettings);

        expect(results.length).to.equal(1);
    });
});