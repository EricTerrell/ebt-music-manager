/*
  EBT Music Manager
  (C) Copyright 2024, Eric Bergman-Terrell

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

const remote = require('@electron/remote');
const dialog = remote.dialog;
const {ipcRenderer} = require('electron');

const StringLiterals = require('./lib/stringLiterals');
const Files = require('./lib/files');
const Constants = require('./lib/constants');
const DialogBoxUtils = require('./lib/dialogBoxUtils');
const Tabulator = require("tabulator-tables");

let audioFileTypeActionsTable = undefined;

wireUpUI();

function wireUpUI() {
    const settings = Files.getSettings();

    const sourceFolderValue = document.querySelector('#source-folder-value');
    const targetFolderValue = document.querySelector('#target-folder-value');
    const ffmpegPathValue = document.querySelector('#ffmpeg-value');
    const checkForUpdates = document.querySelector('#check_for_updates');

    if (settings.sourceFolder !== undefined) {
        sourceFolderValue.innerHTML = settings.sourceFolder;
    }

    if (settings.targetFolder !== undefined) {
        targetFolderValue.innerHTML = settings.targetFolder;
    }

    if (settings.ffmpegPath !== undefined) {
        ffmpegPathValue.innerHTML = settings.ffmpegPath;
    }

    const concurrency = document.querySelector('#concurrency');

    if (settings.concurrency !== undefined) {
        concurrency.value = settings.concurrency;
    }

    const bitRate = document.querySelector('#bit-rate');

    if (settings.bitRate !== undefined) {
        bitRate.value = settings.bitRate;
    }

    checkForUpdates.checked = settings.checkForUpdates;

    const columns = [
        {title: 'Audio File Type', field: 'fileType', width: 200, responsive: 0},
        {title: 'Action', field: 'action', width: 200, responsive: 0, editor: 'list', editorParams: {
                values: [StringLiterals.CONVERT_TO_MP3, StringLiterals.COPY],
                valuesLookupField: 'action'
            },
        }
    ];

    loadActions(settings.audioFileTypeActions);

    async function submit(close) {
        settings.sourceFolder = sourceFolderValue.innerHTML;
        settings.targetFolder = targetFolderValue.innerHTML;
        settings.ffmpegPath = ffmpegPathValue.innerHTML;
        settings.bitRate = bitRate.value;
        settings.concurrency = concurrency.value;
        settings.checkForUpdates = checkForUpdates.checked;

        settings.audioFileTypeActions = [];

        audioFileTypeActionsTable.getData().forEach(row => {
            const item = {
                fileType: row.fileType,
                action: row.action
            };

            // Don't let the user specify that .mp3 files are transcoded to .mp3 files. Copy the file in this case.
            if (item.fileType === StringLiterals.MP3_FILE_TYPE && item.action === StringLiterals.CONVERT_TO_MP3) {
                item.action = StringLiterals.COPY;
            }

            settings.audioFileTypeActions.push(item);
        });

        if (settings.targetFolder.length > 0) {
            if (settings.perOutputFolderSettings === undefined) {
                settings.perOutputFolderSettings = {};
            }

            let outputFolderSettings = settings.perOutputFolderSettings[settings.targetFolder];

            if (outputFolderSettings === undefined) {
                settings.perOutputFolderSettings[settings.targetFolder] = {};
            }

            outputFolderSettings = settings.perOutputFolderSettings[settings.targetFolder];

            outputFolderSettings.sourceFolder = settings.sourceFolder;
            outputFolderSettings.bitRate = settings.bitRate;
            outputFolderSettings.concurrency = settings.concurrency;
            outputFolderSettings.audioFileTypeActions = settings.audioFileTypeActions;
        }

        Files.saveSettings(settings);

        if (close) {
            await ipcRenderer.invoke(StringLiterals.NOTIFY_SETTINGS_CHANGED).then(() => {
                console.log(`sent "${StringLiterals.NOTIFY_SETTINGS_CHANGED}" notification`);
            })

            window.close();
        }
    }

    function updatePerOutputFolderSettings() {
        const perOutputFolderSettings = settings.perOutputFolderSettings[targetFolderValue.innerHTML];

        if (perOutputFolderSettings !== undefined) {
            sourceFolderValue.innerHTML = perOutputFolderSettings.sourceFolder;
            bitRate.value = perOutputFolderSettings.bitRate;
            concurrency.value = perOutputFolderSettings.concurrency;

            loadActions(perOutputFolderSettings.audioFileTypeActions);
        }
    }

    function loadActions(audioFileTypeActions) {
        audioFileTypeActionsTable = new Tabulator('#audio-file-type-actions', {
            index: 'fileType',
            layout: 'fitColumns',
            'persistenceID': 'file-type-actions-grid',
            'persistenceMode': 'local',
            'persistence': true,
            headerVisible: true,
            selectableRows: 1,
            data: audioFileTypeActions,
            dataTree: false,
            columns: columns
        });

    }

    const okButton = document.querySelector('#ok');

    okButton.addEventListener(StringLiterals.CLICK, async () => {
        await submit(true);
    });

    const cancelButton = document.querySelector('#cancel');

    cancelButton.addEventListener(StringLiterals.CLICK, () => {
        window.close();
    });

    const applyButton = document.querySelector('#apply');

    applyButton.addEventListener(StringLiterals.CLICK, async () => {
        await submit(false);
    });

    document.addEventListener(StringLiterals.KEYDOWN, (event) => {
        console.log('KEYDOWN');

        if (event.key === StringLiterals.ESCAPE) {
            window.close();
        } else if (event.key === StringLiterals.ENTER && !okButton.disabled) {
            submit(true).then();
        }
    });

    const sourceFolderButton = document.querySelector('#source-folder');

    sourceFolderButton.addEventListener(StringLiterals.CLICK, async () => {
        dialog.showOpenDialog(remote.getCurrentWindow(), {
            title: 'Specify Source Folder',
            properties: Constants.OPEN_FOLDER_PROPERTIES
        }).then(result => {
            if (!result.canceled) {
                sourceFolderValue.innerHTML = result.filePaths[0];
            }
        });
    });

    const targetFolderButton = document.querySelector('#target-folder');

    targetFolderButton.addEventListener(StringLiterals.CLICK, async () => {
        dialog.showOpenDialog(remote.getCurrentWindow(), {
            title: 'Specify Target Folder',
            properties: Constants.OPEN_FOLDER_PROPERTIES
        }).then(result => {
            if (!result.canceled) {
                targetFolderValue.innerHTML = result.filePaths[0];

                updatePerOutputFolderSettings();
            }
        });
    });

    const ffmpegPathButton = document.querySelector('#ffmpeg-path');

    ffmpegPathButton.addEventListener(StringLiterals.CLICK, () => {
        dialog.showOpenDialog(remote.getCurrentWindow(), {
            title: 'Specify ffmpeg Path',
            properties: Constants.OPEN_FILE_PROPERTIES
        }).then(result => {
            if (!result.canceled) {
                ffmpegPathValue.innerHTML = result.filePaths[0];
            }
        });
    });

    DialogBoxUtils.setupLinks();
}
