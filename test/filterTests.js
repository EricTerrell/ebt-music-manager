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

const Filter = require('../lib/filter');
const ScanForMetadata = require('../lib/scanForMetadata');

describe("Filter tests", function () {
    const metadata = ScanForMetadata.readMetadata('C:\\temp');

    it('should filter playlists', async function () {
        let filterSettings = {
            fieldName: 'playlistAlbumName',
            operation: 'contains',
            text: 'Bach',
            ignoreCase: false
        };

        let results = Filter.filterPlaylists(metadata, filterSettings);

        expect(results.length).to.equal(56);

        filterSettings = {
            fieldName: 'playlistAlbumName',
            operation: 'equals',
            text: 'J.S. Bach - Art of Fugue (BWV 1080) (Leonhardt)',
            ignoreCase: false
        };

        results = Filter.filterPlaylists(metadata, filterSettings);

        expect(results.length).to.equal(1);
    });

    it('should filter by genre', async function () {
        const filterSettings = {
            fieldName: 'genre',
            operation: 'equals',
            text: 'Opera',
            ignoreCase: false
        };

        const results = Filter.filterPlaylists(metadata, filterSettings);

        expect(results.length).to.equal(257);
    });

    it('should filter albums', async function() {
        let filterSettings = {
            fieldName: 'playlistAlbumName',
            operation: 'contains',
            text: 'Bach',
            ignoreCase: false
        };

        let results = Filter.filterAlbums(metadata, filterSettings);

        expect(results.length).to.equal(73);
    });

    it('should filter tracks', async function () {
        let filterSettings = {
            fieldName: 'playlistAlbumName',
            operation: 'contains',
            text: 'Bach',
            ignoreCase: false
        };

        let results = Filter.filterTracks(metadata, filterSettings);

        expect(results.length).to.equal(1165);
    });

    it('should filter with >=', async function() {
        let filterSettings = {
            fieldName: 'title',
            operation: 'ge',
            text: 'Wagner',
            ignoreCase: true
        };

        let results = Filter.filterTracks(metadata, filterSettings);

        expect(results.length).to.equal(1255);

        filterSettings = {
            fieldName: 'title',
            operation: 'ge',
            text: 'Wagner',
            ignoreCase: false
        };

        results = Filter.filterTracks(metadata, filterSettings);

        expect(results.length).to.equal(1336);
    });
});