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

const {ipcRenderer} = require('electron');

const Tabulator = require("tabulator-tables");

const StringLiterals = require('./lib/stringLiterals');
const DialogBoxUtils = require('./lib/dialogBoxUtils');

let tracks = undefined;
let metadata = undefined;
let selectedTrack = undefined;

let trackIndex = 0;

let rows = undefined;

ipcRenderer.on(StringLiterals.PLAY_UI, (event, data) => {
    tracks = data.tracks;
    metadata = data.metadata;
    selectedTrack = data.selectedTrack !== StringLiterals.EMPTY_STRING ? data.selectedTrack : undefined;

    wireUpUI()
});

function wireUpUI() {
    const closeButton = document.querySelector('#close');

    closeButton.addEventListener(StringLiterals.CLICK, async () => {
        window.close();
    });

    DialogBoxUtils.setupEscapeToClose();

    const playlistsTracksGridColumns = [
        {title: "Album", field: "album", width: 200, responsive: 0},
        {title: "Title", field: "title", width: 200, responsive: 0},
        {title: "Disc #", field: "discNumber", width: 100, responsive: 0, sorter: StringLiterals.GRID_SORTER_NUMBER},
        {title: "Track #", field: "trackNumber", width: 100, responsive: 0, sorter: StringLiterals.GRID_SORTER_NUMBER},
        {title: "Sequence", field: StringLiterals.COLUMN_SEQUENCE, width: 100, responsive: 0,
            sorter: StringLiterals.GRID_SORTER_NUMBER
        },
        {title: "File Path", field: "name", width: 100}
    ];

    const tracksGrid = new Tabulator('#tracks-grid', {
        initialSort: [ { column: StringLiterals.COLUMN_SEQUENCE, dir: StringLiterals.GRID_SORT_ASCENDING } ],
        index: 'name',
        'persistenceID': 'play-tracks-grid',
        'persistenceMode': 'local',
        'persistence': true,
        'layout': 'fitDataTable',
        selectableRows: 1,
        'movableRows': false,
        headerVisible: true,
        data: tracks,
        dataTree: false,
        columns: playlistsTracksGridColumns
    });

    tracksGrid.on(StringLiterals.TABLE_BUILT, () => {
        if (tracksGrid.getData().length > 0) {
            if (selectedTrack !== undefined) {
                tracksGrid.selectRow(selectedTrack);
            } else {
                tracksGrid.selectRow(tracksGrid.getData()[0].name);
            }
        }

        rows = tracksGrid.getData();

        player.src = getTrackPath();
    });

    const player = document.querySelector('#player');

    player.addEventListener(StringLiterals.ENDED, () => {
        if (++trackIndex < rows.length) {
            player.src = rows[trackIndex].name;
            player.play();

            setTimeout(() => {
                tracksGrid.deselectRow();
                tracksGrid.selectRow(rows[trackIndex].name);

                tracksGrid.scrollToRow(rows[trackIndex].name, StringLiterals.TOP_OF_GRID, false);
            });
        } else {
            tracksGrid.deselectRow();

            trackIndex = 0;
            tracksGrid.selectRow(rows[trackIndex].name);

            player.src = rows[trackIndex].name;
        }
    });

    player.addEventListener(StringLiterals.PLAY, () => {
        enableDisableButtons();
    })

    tracksGrid.on(StringLiterals.ROW_CLICK, (e, row) => {
        player.src = row.getData().name;
        player.play();

        setTimeout(() => {
            const selectedRows = tracksGrid.getSelectedRows();

            const name = selectedRows[0].getData().name;
            trackIndex = tracksGrid.getRows().findIndex((element) => element.getData().name === name);

            enableDisableButtons();
        });
    });

    const nextButton = document.querySelector('#next');

    nextButton.addEventListener(StringLiterals.CLICK, () => {
        if (++trackIndex < tracksGrid.getData().length) {
            playNextPreviousTrack();
        } else {
            enableDisableButtons();
        }
    });

    const previousButton = document.querySelector('#previous');

    previousButton.addEventListener(StringLiterals.CLICK, () => {
        if (--trackIndex >= 0) {
            playNextPreviousTrack();
        } else {
            enableDisableButtons();
        }
    });

    function playNextPreviousTrack() {
        const rows = tracksGrid.getData();

        player.src = rows[trackIndex].name;
        player.play();

        setTimeout(() => {
            tracksGrid.deselectRow();
            tracksGrid.selectRow(rows[trackIndex].name);

            tracksGrid.scrollToRow(rows[trackIndex].name, 'top', false);

            enableDisableButtons();
        });
    }

    function enableDisableButtons() {
        nextButton.disabled = trackIndex >= tracksGrid.getData().length - 1;
        previousButton.disabled = trackIndex <= 0;
    }

    function getTrackPath() {
        let trackPath;

        trackIndex = 0;

        const rows = tracksGrid.getData();

        if (rows.length > 0) {
            const selectedRows = tracksGrid.getSelectedRows();

            if (selectedRows.length === 1) {
                trackPath = tracksGrid.getSelectedRows()[0].getData().name;

                trackIndex = Math.max(0, rows.findIndex(element => element.name === selectedTrack));
            } else {
                trackPath = rows[trackIndex].name;
            }
        } else if (rows.length === 0) {
            trackPath = rows[0].name;
        }

        return trackPath;
    }
}
