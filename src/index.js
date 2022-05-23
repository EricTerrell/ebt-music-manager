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
const fs = require('fs');

const {ipcRenderer} = require('electron');
const remote = require('@electron/remote');
const {dialog} = remote;

const Tabulator = require('tabulator-tables');

const StringLiterals = require('./lib/stringLiterals');
const ScanForMetadata = require('./lib/scanForMetadata');
const DataTableUtils = require('./lib/dataTableUtils');
const Constants = require('./lib/constants');
const Metadata = require('./lib/metadata');
const WindowUtils = require('./lib/windowUtils');
const Cancel = require('./lib/cancel');
const Sync = require('./lib/sync');
const DeleteUtils = require('./lib/deleteUtils');
const ErrorHandler = require('./lib/errorHandler');
const PlaylistCreator = require('./lib/playlistCreator');
const Files = require('./lib/files');
const ProgressMessage = require('./lib/progressMessage');

const scanButton = document.querySelector('#scan');

const saveTracksEditsButton = document.querySelector('#save-tracks-edits');
const undoTracksEditsButton = document.querySelector('#undo-tracks-edits');

const savePlaylistEditsButton = document.querySelector('#save-playlists-edits');
const undoPlaylistEditsButton = document.querySelector('#undo-playlists-edits');

const syncButton = document.querySelector('#sync-target-folder');

const editingHeader = document.querySelector('#editing-header');

let tracksTable = undefined;

let tracksTableBuilt = false;

let tracksTableEntireColumnsUpdated = {};

let hierarchyTable = undefined;

let metadata = undefined;

let oldSourceFolder = undefined;

const radioButtonPlaylists = document.querySelector('#radio_button_playlists');
const radioButtonAlbums = document.querySelector('#radio_button_albums');
const radioButtonTracks = document.querySelector('#radio_button_tracks');

const reorderTracksButton = document.querySelector('#reorder-tracks');

const selectAllTracksButton = document.querySelector('#select-all-tracks');
const unselectAllTracksButton = document.querySelector('#unselect-all-tracks');

wireUpUI();

function wireUpUI() {
    ipcRenderer.on(StringLiterals.NOTIFY_SETTINGS_CHANGED, () => {
        console.info('index.js: settings changed');

        const settings = Files.getSettings();

        if (oldSourceFolder !== settings.sourceFolder && fs.existsSync(settings.targetFolder)) {
            console.log(`reload since source folder has changed`);

            oldSourceFolder = settings.sourceFolder;

            loadCachedMetadata();
        }
    });

    ipcRenderer.on(StringLiterals.USER_CANCELLED, () => {
        console.log(`index.js: got "${StringLiterals.USER_CANCELLED}" message`);

        Cancel.cancel();
    });

    ipcRenderer.on(StringLiterals.UPSERT_PLAYLIST, (event, data) => {
        console.log(`index.js received "ADDED_PLAYLIST" (${data})`);

        ScanForMetadata.upsertPlaylist(data, metadata);

        refresh(getSelectedHierarchyRowData());
    });

    const itemCount = document.querySelector('#hierarchy-item-count');

    const settingsButton = document.querySelector('#settings');

    function launchSettingsUI() {
        const settingsUIWindow = WindowUtils.createWindow('settings_ui', true);
        remote.require("@electron/remote/main").enable(settingsUIWindow.webContents);
    }

    settingsButton.addEventListener(StringLiterals.CLICK, () => {
        launchSettingsUI();
    });

    const addToPlaylistButton = document.querySelector('#add-to-playlist');

    addToPlaylistButton.addEventListener(StringLiterals.CLICK, async () => {
        const selectedTracks = tracksTable.searchData('selected', '=', true);

        const playlistWindow = WindowUtils.createWindow('playlist', true);
        remote.require("@electron/remote/main").enable(playlistWindow.webContents);

        playlistWindow.webContents.once(StringLiterals.DID_FINISH_LOAD, () => {
            ipcRenderer.sendTo(playlistWindow.id, StringLiterals.CHILD_WINDOW_CHANNEL, {
                'playlists': Object.keys(metadata.playlists),
                'tracks': selectedTracks,
                'defaultPlaylistName': getSelectedHierarchyRowData() !== undefined ?
                    getSelectedHierarchyRowData().displayName : StringLiterals.EMPTY_STRING,
                metadata
            });
        });
    });

    radioButtonPlaylists.addEventListener(StringLiterals.CLICK, () => {
        updateTables();
    });

    radioButtonAlbums.addEventListener(StringLiterals.CLICK, () => {
        disableSaveAndUndoButtons();

        updateTables();
    });

    radioButtonTracks.addEventListener(StringLiterals.CLICK, () => {
        disableSaveAndUndoButtons();

        updateTables();
    });

    reorderTracksButton.addEventListener(StringLiterals.CLICK, () => {
        reorderTracks();
    });

    scanButton.addEventListener(StringLiterals.CLICK, async () => {
        scan();

        disableSaveAndUndoButtons();
    });

    saveTracksEditsButton.addEventListener(StringLiterals.CLICK, async () => {
        busy(true, 'Saving changes');

        setTimeout(async () => {
            function finish() {
                refresh(getSelectedHierarchyRowData(), false);

                busy(false);
            }

            saveChanges().then(() => {
                finish();

                saveTracksEditsButton.disabled = true;
                undoTracksEditsButton.disabled = true;
                reorderTracksButton.disabled = true;
            }, reason => {
                finish();

                console.error(`saveChanges interrupted reason: ${reason}`);
            });
        });
    });

    undoTracksEditsButton.addEventListener(StringLiterals.CLICK, () => {
        loadTable({ 'type': StringLiterals.TYPE_ALL_TRACKS });

        undoTracksEditsButton.disabled = true;
        saveTracksEditsButton.disabled = true;
    });

    selectAllTracksButton.addEventListener(StringLiterals.CLICK, async () => {
        await updateTracksSelection(true);

        checkTrackSelection();
    });

    unselectAllTracksButton.addEventListener(StringLiterals.CLICK, async () => {
        await updateTracksSelection(false);

        checkTrackSelection();
    });

    savePlaylistEditsButton.addEventListener(StringLiterals.CLICK, async () => {
        savePlaylistChanges();

        savePlaylistEditsButton.disabled = true;
        undoPlaylistEditsButton.disabled = true;
    });

    undoPlaylistEditsButton.addEventListener(StringLiterals.CLICK, async () => {
        updateTables(getSelectedItemType(), getSelectedHierarchyRowData());

        savePlaylistEditsButton.disabled = true;
        undoPlaylistEditsButton.disabled = true;
    });

    syncButton.addEventListener(StringLiterals.CLICK, () => {
        const settings = Files.getSettings();

        if (settings.sourceFolder === undefined || settings.targetFolder === undefined ||
            settings.bitRate === undefined || settings.ffmpegPath === undefined ||
            settings.concurrency === undefined ||
            !fs.existsSync(settings.sourceFolder) || !fs.existsSync(settings.targetFolder) ||
            !fs.existsSync(settings.ffmpegPath)) {
            const options = {
                type: StringLiterals.DIALOG_INFO,
                title: 'Specify Settings',
                message: 'All settings must be specified in order to transcode',
                buttons: Constants.OK,
                defaultId: 0,
                cancelId: 2
            };

            dialog.showMessageBox(remote.getCurrentWindow(), options)
                .then(() => {
                    launchSettingsUI();
                });
        } else {
            busy(true, 'Syncing Target Folder');

            setTimeout(async () => {
                new Sync(settings.sourceFolder, settings.targetFolder)
                    .sync(metadata !== undefined ? metadata.audioFilePathToMetadata : undefined)
                    .then(() => {
                        console.log('Sync.sync completed successfully');
                    }, reason => {
                        console.error(`Sync.sync interrupted reason: ${reason}`);

                        busy(false);

                        if (reason.toString() !== (new Error(StringLiterals.USER_CANCELLED)).toString()) {
                            ErrorHandler.displayError(reason);
                        }
                    });
            });
        }
    });

    function updateTables(selectedItemType = getSelectedItemType(), selectedHierarchyRowData = undefined) {
        console.log(`updateTables ${selectedItemType}`);

        let tableData = [];

        if (metadata !== undefined) {
            tableData = DataTableUtils.toTableData(metadata, selectedItemType);
        }

        const editor = selectedItemType === StringLiterals.ITEM_TYPE_PLAYLISTS ?
            StringLiterals.GRID_EDITOR_INPUT : undefined;

        const columns = [
            {title: 'Name', field: 'displayName', responsive: 0, editor: editor, cellEdited: playlistCellEdited},
            {title: 'FullName', field: 'name', 'visible': false},
        ];

        if (selectedItemType === StringLiterals.ITEM_TYPE_PLAYLISTS) {
            columns.push(
                {formatter: printIconDelete, headerSort: false, width: 30, cellClick: function(e, cell) { deletePlaylist(e, cell); }}
            );
        }

        hierarchyTable = new Tabulator("#hierarchy-grid", {
            'index': 'name',
            'data': tableData,
            'dataTree': false,
            'layout': 'fitColumns',
            'selectable': 1,
            'headerVisible': true,
            'columns': columns
        });

        hierarchyTable.on('rowClick', function(e, row) {
            loadTable(row.getData());
        });

        hierarchyTable.on('tableBuilt', function() {
            if (selectedItemType !== StringLiterals.ITEM_TYPE_TRACKS) {
                itemCount.innerHTML = `(${tableData.length.toLocaleString()} items)`;
            }

            if (selectedHierarchyRowData !== undefined) {
                const searchRows = hierarchyTable.searchRows("name", "=", selectedHierarchyRowData.name);

                if (searchRows.length === 1) {
                    hierarchyTable.scrollToRow(searchRows[0], 'top', false);
                    hierarchyTable.selectRow(searchRows[0].getData().name);
                }
            }
        });

        if (selectedItemType === StringLiterals.ITEM_TYPE_TRACKS) {
            loadTable({ 'type': StringLiterals.TYPE_ALL_TRACKS });
        } else {
            loadTable(selectedHierarchyRowData);
        }

        checkTrackSelection();
    }

    function loadTable(rowData = undefined) {
        tracksTableEntireColumnsUpdated = {};

        addToPlaylistButton.disabled = true;
        reorderTracksButton.disabled = true;

        let trackArray = [];

        let editingMessage = StringLiterals.EMPTY_STRING;

        const tableColumns = DataTableUtils.getTracksTableColumns(createContextMenu, deleteTrack, cellEdited,
            printIconDelete);

        if (rowData === undefined) {
            editingMessage = StringLiterals.EMPTY_STRING;
            trackArray = [];
        } else {
            switch (rowData.type) {
                case StringLiterals.ITEM_TYPE_ALBUMS: {
                    editingMessage = `Editing Album "${rowData.name}":`;
                    trackArray = loadTracks((metadata) => metadata.common.album === rowData.name);
                }
                    break;

                case StringLiterals.ITEM_TYPE_PLAYLISTS: {
                    editingMessage = `Editing Playlist "${rowData.name}":`;

                    trackArray = metadata.playlists[rowData.name]
                        .map(p => ({
                                'audioFilePath': p.audioFilePath,
                                'metadata': metadata.audioFilePathToMetadata[p.audioFilePath]
                            }));
                }
                    break;

                case StringLiterals.TYPE_ALL_TRACKS: {
                    editingMessage = `Editing All Tracks:`;

                    trackArray = loadTracks(() => true);
                }
                    break;
            }
        }

        const tableData = DataTableUtils.trackArrayToTableData(trackArray);

        if (tracksTable === undefined) {
            tracksTable = new Tabulator('#tracks-grid', {
                'index': 'name',
                'persistenceID': 'tracks-grid',
                'persistenceMode': 'local',
                'persistence': true,
                'layout': 'fitDataTable',
                'movableRows': true,
                'selectable': 1,
                'data': tableData,
                'dataTree': false,
                'columns': tableColumns
            });

            tracksTable.on('rowMoved', function() {
                if (canMoveRows()) {
                    reorderTracksButton.disabled = false;
                }
            });

            tracksTable.on('tableBuilt', () => {
                tracksTableBuilt = true;
            });
        } else {
            tracksTable.replaceData(tableData);
        }

        if (tracksTableBuilt) {
            if (getSelectedItemType() === StringLiterals.ITEM_TYPE_PLAYLISTS) {
                tracksTable.showColumn(StringLiterals.COLUMN_PLAYLIST_POSITION);
            } else {
                tracksTable.hideColumn(StringLiterals.COLUMN_PLAYLIST_POSITION);
            }
        }

        editingHeader.textContent = trackArray.length > 0 ? editingMessage : StringLiterals.EMPTY_STRING;

        itemCount.innerHTML = trackArray.length > 0 ?
            `(${trackArray.length.toLocaleString()} tracks)` : StringLiterals.EMPTY_STRING;

        selectAllTracksButton.disabled =
            tableData.length === 0 || getSelectedItemType() === StringLiterals.ITEM_TYPE_TRACKS;
    }

    function createContextMenu(fieldName) {
        return [
            {
                label: `Copy cell value to all rows...`,
                action:function(e, cell){
                    console.log(`context menu clicked :${cell}`);

                    const field = cell.getColumn().getDefinition().field;
                    const value = cell.getValue();
                    const table = cell.getTable();

                    const options = {
                        type: StringLiterals.DIALOG_QUESTION,
                        title: 'Copy Field Value',
                        message: `Copy "${fieldName}" value of "${value}" to all rows?`,
                        buttons: Constants.YES_NO_CANCEL,
                        defaultId: 0,
                        cancelId: 2,
                        icon: './resources/question_mark.png'
                    };

                    dialog.showMessageBox(remote.getCurrentWindow(), options)
                        .then(response => {
                            if (response.response === 0) {
                                tracksTableEntireColumnsUpdated[field] = true;

                                DataTableUtils.copyFieldValueToEntireColumn(field, value, table).then(changes => {
                                    if (changes > 0) {
                                        saveTracksEditsButton.disabled = false;
                                        undoTracksEditsButton.disabled = false;
                                    }
                                });
                            }
                        });
                },
                disabled: function() {
                    return getSelectedItemType() === StringLiterals.ITEM_TYPE_TRACKS;
                }
            }];
    }

    function loadTracks(filter) {
        return Object.entries(metadata.audioFilePathToMetadata)
            .filter(([, value]) => filter(value))
            .map(function ([audioFilePath, metadata]) {
                return {
                    audioFilePath,
                    metadata
                };
            });
    }

    function cellEdited(cell) {
        console.log(`cellEdited: name: "${cell._cell.row.data.name}" cell name: "${cell._cell.column.definition.field}" value: "${cell._cell.value}" old value: ${cell._cell.oldValue}`);

        let rowData = cell.getRow().getData();
        const field = cell.getColumn().getField();

        if (field !== 'selected') {
            rowData.changed = true;
        }

        cell.getTable().updateData([rowData]);

        if (rowData.changed) {
            undoTracksEditsButton.disabled = false;
            saveTracksEditsButton.disabled = false;
        }

        checkTrackSelection();
    }

    function playlistCellEdited() {
        savePlaylistEditsButton.disabled = false;
        undoPlaylistEditsButton.disabled = false;
    }

    function savePlaylistChanges() {
        const oldRowData = getSelectedHierarchyRowData();

        for (const editedCell of hierarchyTable.getEditedCells()) {
            const oldPlaylistPath = editedCell.getData().name;

            const newPlaylistName = `${editedCell.getData().displayName}.${StringLiterals.PLAYLIST_FILE_TYPE}`;

            const newPlaylistPath = path.join(path.dirname(oldPlaylistPath), newPlaylistName);

            try {
                fs.renameSync(oldPlaylistPath, newPlaylistPath);

                ScanForMetadata.renamePlaylist(oldPlaylistPath, newPlaylistPath, metadata);

                if (oldRowData !== undefined) {
                    oldRowData.name = newPlaylistPath;
                }
            } catch (err) {
                ErrorHandler.displayError(err);
            }
        }

        refresh(oldRowData, true, StringLiterals.UPDATING_DISPLAY);
    }

    function checkTrackSelection() {
        let selectedCount = 0;
        let rowCount = 0;

        for (const rowData of tracksTable.getData()) {
            if (rowData.selected) {
                selectedCount++;
            }

            rowCount++;
        }

        addToPlaylistButton.disabled = selectedCount === 0;

        const selectedItemType = getSelectedItemType();

        selectAllTracksButton.disabled = rowCount === 0 || selectedCount === rowCount ||
            selectedItemType === StringLiterals.ITEM_TYPE_TRACKS;
        unselectAllTracksButton.disabled = selectedCount === 0 ||
            selectedItemType === StringLiterals.ITEM_TYPE_TRACKS;
    }

    async function saveChanges() {
        Cancel.reset();

        const updatedFiles = {};

        for (const editedCell of DataTableUtils.getEditedCells(tracksTable, tracksTableEntireColumnsUpdated)) {
            Cancel.checkForCancellation();

            const data = editedCell.getData();
            const field = editedCell.getField();
            const audioFilePath = data.name;
            const value = editedCell.getValue();

            updatedFiles[audioFilePath] = true;

            ProgressMessage.send(`Changing "${field}" to "${value}" in file "${data.name}"`);

            const updates = DataTableUtils.getUpdatesForField(field, value);

            if (updates !== undefined) {
                for (const update of updates) {
                    await Metadata.write(audioFilePath, update);
                }
            }
        }

        // Now update cached metadata with all changes.
        for (const filePath of Object.keys(updatedFiles)) {
            console.log(`filePath: "${filePath}"`);

            metadata.audioFilePathToMetadata[filePath] = await ScanForMetadata.retrieveMetadata(filePath);
        }

        if (getSelectedItemType() === StringLiterals.ITEM_TYPE_PLAYLISTS) {
            savePlaylist();
        }

        const settings = Files.getSettings();
        ScanForMetadata.writeMetadata(metadata, settings.targetFolder);
    }

    function savePlaylist() {
        const playlist = hierarchyTable.getSelectedRows()[0].getData().name;
        console.log(`savePlaylist playlist: ${playlist}`);

        // Update metadata
        const tracks = tracksTable
            .getData()
            .sort((a, b) => a.playlistPosition - b.playlistPosition)
            .map(row => ({
                    'name': row.name
                }
            ));

        metadata.playlists[playlist] = tracks;

        // Save the playlist
        PlaylistCreator.write(playlist, tracks);
    }

    function refresh(selectedHierarchyRowData = undefined, displayBusy = true, message = undefined) {
        try {
            if (displayBusy) {
                busy(true, message);
            }

            const settings = Files.getSettings();

            metadata = ScanForMetadata.buildScanResults(metadata.playlistFilePaths, metadata.audioFilePathToMetadata,
                settings.targetFolder);

            ScanForMetadata.writeMetadata(metadata, settings.targetFolder);

            updateTables(getSelectedItemType(), selectedHierarchyRowData);

            scanButton.disabled = false;
        } catch (err) {
            ErrorHandler.displayError(err);
        } finally {
            if (displayBusy) {
                busy(false);
            }
        }
    }

    function busy(displayDialog, message = StringLiterals.EMPTY_STRING) {
        ipcRenderer.invoke(StringLiterals.BUSY, {
            displayDialog,
            message
        }).then();
    }

    function getSelectedItemType() {
        if (radioButtonPlaylists.checked) {
            return StringLiterals.ITEM_TYPE_PLAYLISTS;
        } else if (radioButtonAlbums.checked) {
            return StringLiterals.ITEM_TYPE_ALBUMS;
        } else {
            return StringLiterals.ITEM_TYPE_TRACKS;
        }
    }

    function getSelectedHierarchyRowData() {
        return hierarchyTable !== undefined && hierarchyTable.getSelectedRows().length === 1 ?
            hierarchyTable.getSelectedRows()[0].getData() : undefined;
    }

    async function updateTracksSelection(selected) {
        const updatedData = tracksTable
            .getData()
            .filter(rowData => rowData.selected !== selected)
            .map(rowData => {
                rowData.selected = selected;

                return rowData;
            });

        await tracksTable.updateData(updatedData);
    }

    function loadCachedMetadata() {
        try {
            busy(true, StringLiterals.LOADING_CACHED_METADATA);

            const settings = Files.getSettings();
            metadata = ScanForMetadata.readMetadata(settings.targetFolder);

            if (metadata !== undefined) {
                updateTables();
            }
        } catch (err) {
            ErrorHandler.displayError(err);
        } finally {
            busy(false);
        }
    }

    function deletePlaylist(e, cell) {
        const playlistPath = cell.getRow().getData().name;
        const playlistName = path.basename(playlistPath);

        const options = {
            type: StringLiterals.DIALOG_QUESTION,
            title: 'Delete Playlist',
            message: `Delete Playlist "${playlistName}"?`,
            buttons: Constants.YES_NO_CANCEL,
            defaultId: 0,
            cancelId: 2,
            icon: './resources/question_mark.png'
        };

        dialog.showMessageBox(remote.getCurrentWindow(), options)
            .then(response => {
                if (response.response === 0) {
                    try {
                        DeleteUtils.deletePlaylist(playlistPath, metadata);
                    } catch (err) {
                        ErrorHandler.displayError(err);
                    }

                    refresh(undefined, true, StringLiterals.UPDATING_DISPLAY);
                }
            });
    }

    function deleteTrack(e, cell) {
        const trackPath = cell.getRow().getData().name;
        const trackName = path.basename(trackPath);
        const trackTitle = cell.getRow().getData().title;

        const options = {
            type: StringLiterals.DIALOG_QUESTION,
            title: 'Delete Track',
            message: `Delete Track "${trackName}" ("${trackTitle}")?`,
            buttons: Constants.YES_NO_CANCEL,
            defaultId: 0,
            cancelId: 2,
            icon: './resources/question_mark.png'
        };

        dialog.showMessageBox(remote.getCurrentWindow(), options)
            .then(response => {
                if (response.response === 0) {
                    try {
                        DeleteUtils.deleteTrack(trackPath, metadata);
                    } catch (err) {
                        ErrorHandler.displayError(err);
                    }

                    refresh(getSelectedHierarchyRowData(), true, StringLiterals.UPDATING_DISPLAY);
                }
            });
    }

    function reorderTracks() {
        let sequenceNumber = 1;

        const itemType = getSelectedItemType();

        const updatedData = [];

        for (const row of DataTableUtils.getRowsInDisplayedOrder(tracksTable)) {
            const data = row.getData();

            if (itemType === StringLiterals.ITEM_TYPE_ALBUMS) {
                data.trackNumber = sequenceNumber++;
                data.changed = true;

                updatedData.push(data);
            } else if (itemType === StringLiterals.ITEM_TYPE_PLAYLISTS) {
                data.playlistPosition = sequenceNumber++;
                data.changed = true;

                updatedData.push(data);
            }
        }

        tracksTable.updateData(updatedData);

        reorderTracksButton.disabled = true;
        undoTracksEditsButton.disabled = false;
        saveTracksEditsButton.disabled = false;
    }

    function canMoveRows() {
        const selectedItemType = getSelectedItemType();

        let canMoveRows = tracksTable !== undefined && tracksTable.getRows().length > 1 &&
                (selectedItemType === StringLiterals.ITEM_TYPE_PLAYLISTS ||
                 selectedItemType === StringLiterals.ITEM_TYPE_ALBUMS);

        // Cannot move rows if the grid is album tracks, and there are multiple disc numbers.
        if (canMoveRows && selectedItemType === StringLiterals.ITEM_TYPE_ALBUMS) {
            const discNumbers = {};

            for (const row of tracksTable.getRows()) {
                const data = row.getData();

                discNumbers[`${data.discNumber}`] = true;
            }

            canMoveRows = Object.keys(discNumbers).length === 1;
        }

        return canMoveRows;
    }

    function checkSettings() {
        const settings = Files.getSettings();

        if (settings.sourceFolder === undefined || settings.targetFolder === undefined ||
            !fs.existsSync(settings.sourceFolder) || !fs.existsSync(settings.targetFolder)) {

            const options = {
                type: StringLiterals.DIALOG_INFO,
                title: 'Specify Settings',
                message: 'Source and Target Folders must be specified',
                buttons: Constants.OK,
                defaultId: 0,
                cancelId: 2
            };

            dialog.showMessageBox(remote.getCurrentWindow(), options)
                .then(() => {
                    launchSettingsUI();
                });
        } else {
            loadCachedMetadata();
        }
    }

    function disableSaveAndUndoButtons() {
        saveTracksEditsButton.disabled = true;
        undoTracksEditsButton.disabled = true;

        savePlaylistEditsButton.disabled = true;
        undoPlaylistEditsButton.disabled = true;
    }

    const licenseTermsData = Files.getLicenseTerms();

    if (!licenseTermsData.userAccepted) {
        const licenseTermsWindow = WindowUtils.createWindow('license_terms');

        // https://github.com/electron/remote/pull/72#issuecomment-924933800
        remote.require("@electron/remote/main").enable(licenseTermsWindow.webContents)

        licenseTermsWindow.on('closed', () => {
            checkSettings();
        })
    } else {
        checkSettings();
    }

    function scan() {
        const selectedItemType = getSelectedItemType();
        const selectedHierarchyRowData = getSelectedHierarchyRowData();

        busy(true, 'Scanning audio files and playlists, extracting metadata');

        editingHeader.textContent = StringLiterals.EMPTY_STRING;

        // Run the rest of the scan later so that Scan button is visibly disabled immediately.
        setTimeout(() => {
            function finish() {
                updateTables(selectedItemType, selectedHierarchyRowData);

                busy(false);
            }

            const settings = Files.getSettings();

            const cachedAudioFileMetadata = metadata !== undefined ? metadata.audioFilePathToMetadata : undefined;

            ScanForMetadata.scan(settings.sourceFolder, settings.targetFolder, cachedAudioFileMetadata).then(result => {
                metadata = result;

                ScanForMetadata.writeMetadata(metadata, settings.targetFolder);

                finish();
            }, reason => {
                console.error(reason);

                finish();
            });
        });
    }

    function printIconDelete() {
        return "<image src='file:///./resources/trash.svg'/>";
    }
}