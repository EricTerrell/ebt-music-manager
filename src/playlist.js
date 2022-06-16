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

const remote = require("@electron/remote");
const {dialog} = remote;
const {ipcRenderer} = require('electron');

const StringLiterals = require('./lib/stringLiterals');
const PlaylistCreator = require('./lib/playlistCreator');
const DialogBoxUtils = require('./lib/dialogBoxUtils');
const Constants = require('./lib/constants');
const DataTableUtils = require('./lib/dataTableUtils');
const Filter = require('./lib/filter');

const Tabulator = require("tabulator-tables");

let tracks = undefined;
let playlists = undefined;
let defaultPlaylistName = undefined;
let metadata = undefined;

let radioExisting = undefined;
let radioNew = undefined;

let playlistsGrid = undefined;

let playlistTracksGrid = undefined;

let newPlaylist = undefined;

let okButton = undefined;

ipcRenderer.on(StringLiterals.CHILD_WINDOW_CHANNEL, (event, data) => {
    tracks = data.tracks;
    playlists = data.playlists;
    defaultPlaylistName = data.defaultPlaylistName;
    metadata = data.metadata;

    wireUpUI()
});

function wireUpUI() {
    const filterCheckbox = document.querySelector('#filter-checkbox');
    const filterCaseInsensitive = document.querySelector('#filter-case-insensitive');
    const filterFieldName = document.querySelector('#filter-field-name');
    const filterOperation = document.querySelector('#filter-operation');
    const filterText = document.querySelector('#filter-text');

    // When filter settings are changed, update UI asynchronously (so that user's typing is not disrupted).
    const update = () => {
        setTimeout(async () => {
            updateUIForFilterSettings();
        });
    };

    filterCheckbox.addEventListener(StringLiterals.CHANGE, update);
    filterCaseInsensitive.addEventListener(StringLiterals.CHANGE, update);
    filterText.addEventListener(StringLiterals.KEYDOWN, update);
    filterFieldName.addEventListener(StringLiterals.CHANGE, update);
    filterOperation.addEventListener(StringLiterals.CHANGE, update);

    radioExisting = document.querySelector('#radio-existing');

    radioExisting.addEventListener(StringLiterals.CLICK, () => {
        updatePlaylistTracks(playlistsGrid.getSelectedRows());

        enableDisableButtons();
    });

    radioNew = document.querySelector('#radio-new');

    radioNew.addEventListener(StringLiterals.CLICK, () => {
        updatePlaylistTracks();

        enableDisableButtons();
    });

    newPlaylist = document.querySelector('#new-playlist');
    newPlaylist.value = defaultPlaylistName;

    newPlaylist.addEventListener(StringLiterals.INPUT, () => {
        enableDisableButtons();
    });

    const cancelButton = document.querySelector('#cancel');

    cancelButton.addEventListener(StringLiterals.CLICK, async () => {
        window.close();
    });

    const itemCount = document.querySelector('#playlist-tracks-item-count');

    function updateItemCount(newCount) {
        itemCount.innerHTML = `(${newCount.toLocaleString()} tracks)`;
    }

    function saveAndClose(newPlaylistPath) {
        const playlistTracks = DataTableUtils.getRowsInDisplayedOrder(playlistTracksGrid)
            .map(row => row.getData());

        newPlaylistPath = PlaylistCreator.write(newPlaylistPath, playlistTracks);

        // Send cancel notification to main process.
        ipcRenderer.invoke(StringLiterals.UPSERT_PLAYLIST, newPlaylistPath)
            .then(() => {
                console.log(`playlist: sent "ADDED_PLAYLIST" notification ("${newPlaylistPath}")`);
            });

        window.close();
    }

    function updatePlaylistTracks(rows = undefined) {
        const newTracks = [];

        if (rows !== undefined && rows.length === 1) {
            const rowData = rows[0].getData();

            const trackPaths = metadata.playlists[rowData.path];

            let sequence = 1;

            for (const trackPath of trackPaths) {
                const trackMetadata = metadata.audioFilePathToMetadata[trackPath.audioFilePath];

                const addTrack = {
                    'name': trackPath.audioFilePath,
                    'album': trackMetadata?.common?.album,
                    'title': trackMetadata?.common?.title,
                    'discNumber': trackMetadata?.common.disk?.no,
                    'trackNumber': trackMetadata?.common.track?.no,
                    'sequence': sequence++
                };

                newTracks.push(addTrack);
            }
        }

        const allTracks = tracks.concat(newTracks);

        playlistTracksGrid.replaceData(allTracks);

        updateItemCount(allTracks.length);
    }

    function enableDisableButtons() {
        okButton.disabled = getNewPlaylistPath() === undefined;
    }

    function getNewPlaylistPath() {
        let name = undefined;

        if (radioExisting.checked && playlistsGrid.getSelectedRows().length === 1) {
            name = playlistsGrid.getSelectedData()[0].path;
        } else if (radioNew.checked && newPlaylist.value.trim() !== StringLiterals.EMPTY_STRING) {
            name = PlaylistCreator.getFullPath(newPlaylist.value);
        }

        return name;
    }

    function updateUIForFilterSettings() {
        loadPlaylistsGrid();
    }

    function loadPlaylistsGrid() {
        const existingPlaylistsGridColumns = [{
            title: 'Name',
            field: 'name',
            headerSort: true
        },
            {
                title: 'Full Path',
                field: 'path',
                visible: true
            }];

        const ext = `.${StringLiterals.PLAYLIST_FILE_TYPE}`;

        const data = Filter
            .filterPlaylists(metadata, Filter.getFilterSettings(filterCheckbox, filterFieldName, filterOperation, filterText, filterCaseInsensitive))
            .map(playlist => {
                return {
                    name: path.basename(playlist, ext),
                    path: playlist
                };
            });

        playlistsGrid = new Tabulator('#existing-playlists-grid', {
            initialSort: [ { column: 'name', dir: StringLiterals.GRID_SORT_ASCENDING} ],
            index: 'name',
            layout: 'fitColumns',
            headerVisible: true,
            selectable: 1,
            data: data,
            dataTree: false,
            columns: existingPlaylistsGridColumns
        });

        playlistsGrid.on('rowClick', () => {
            enableDisableButtons();
        });

        playlistsGrid.on('rowSelected', (row) => {
            updatePlaylistTracks([row]);
        });

        playlistsGrid.on('rowDeselected', () => {
            updatePlaylistTracks();
        });
    }

    function loadTracksGrid() {
        const playlistsTracksGridColumns = [
            {rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30},
            {title: "Album", field: "album", width: 200, responsive: 0},
            {title: "Title", field: "title", width: 200, responsive: 0},
            {title: "Disc #", field: "discNumber", width:100, responsive: 0, sorter: StringLiterals.GRID_SORTER_NUMBER},
            {title: "Track #", field: "trackNumber", width:100, responsive: 0, sorter: StringLiterals.GRID_SORTER_NUMBER},
            {title: "Sequence", field: StringLiterals.COLUMN_SEQUENCE, width: 100, responsive: 0,
                sorter: StringLiterals.GRID_SORTER_NUMBER
            },
            {title: "File Path", field: "name", width: 100}
        ];

        playlistTracksGrid = new Tabulator('#playlist-tracks-grid', {
            initialSort: [ { column: StringLiterals.COLUMN_SEQUENCE, dir: StringLiterals.GRID_SORT_ASCENDING } ],
            index: 'name',
            'persistenceID': 'playlist-tracks-grid',
            'persistenceMode': 'local',
            'persistence': true,
            'layout': 'fitDataTable',
            'selectable': 1,
            'movableRows': true,
            headerVisible: true,
            data: tracks,
            dataTree: false,
            columns: playlistsTracksGridColumns
        });
    }

    okButton = document.querySelector('#ok');

    okButton.addEventListener(StringLiterals.CLICK, async () => {
        const newPlaylistPath = getNewPlaylistPath();

        if (radioNew.checked && fs.existsSync(newPlaylistPath)) {
            const options = {
                type: StringLiterals.DIALOG_QUESTION,
                title: `Overwrite Playlist`,
                message: `Overwrite playlist "${newPlaylistPath}"?`,
                buttons: Constants.YES_NO_CANCEL,
                defaultId: 0,
                cancelId: 2,
                icon: './resources/question_mark.png'
            };

            dialog.showMessageBox(remote.getCurrentWindow(), options)
                .then(response => {
                    if (response.response === 0) {
                        saveAndClose(newPlaylistPath)
                    }
                });
        } else {
            saveAndClose(newPlaylistPath);
        }
    });

    DialogBoxUtils.setupEscapeToClose();

    loadPlaylistsGrid();
    loadTracksGrid();

    updateItemCount(tracks.length);

    enableDisableButtons();
}
