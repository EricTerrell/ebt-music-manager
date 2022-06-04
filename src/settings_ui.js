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

const remote = require('@electron/remote');
const dialog = remote.dialog;
const {ipcRenderer} = require('electron');

const StringLiterals = require('./lib/stringLiterals');
const Files = require('./lib/files');
const Constants = require('./lib/constants');
const DialogBoxUtils = require('./lib/dialogBoxUtils');

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

    async function submit() {
        settings.sourceFolder = sourceFolderValue.innerHTML;
        settings.targetFolder = targetFolderValue.innerHTML;
        settings.ffmpegPath = ffmpegPathValue.innerHTML;
        settings.bitRate = bitRate.value;
        settings.concurrency = concurrency.value;
        settings.checkForUpdates = checkForUpdates.checked;

        Files.saveSettings(settings);

        await ipcRenderer.invoke(StringLiterals.NOTIFY_SETTINGS_CHANGED).then(() => {
            console.log(`sent "${StringLiterals.NOTIFY_SETTINGS_CHANGED}" notification`);
        })

        window.close();
    }

    const okButton = document.querySelector('#ok');

    okButton.addEventListener(StringLiterals.CLICK, async () => {
        await submit();
    });

    const cancelButton = document.querySelector('#cancel');

    cancelButton.addEventListener(StringLiterals.CLICK, () => {
        window.close();
    });

    document.addEventListener(StringLiterals.KEYDOWN, (event) => {
        console.log('KEYDOWN');

        if (event.key === StringLiterals.ESCAPE) {
            window.close();
        } else if (event.key === StringLiterals.ENTER && !okButton.disabled) {
            submit().then();
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
