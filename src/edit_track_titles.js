/*
  EBT Music Manager
  (C) Copyright 2026, Eric Bergman-Terrell

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

const StringLiterals = require('./lib/stringLiterals');
const DialogBoxUtils = require('./lib/dialogBoxUtils');

let searchText = undefined;
let replaceAllButton = undefined;
let findWhatInput = undefined;

ipcRenderer.on(StringLiterals.EDIT_TRACK_TITLES_INIT, (event, data) => {
    searchText = data.search_text;

    wireUpUI()
});

function wireUpUI() {
    findWhatInput = document.querySelector('#find_what');

    if (searchText !== undefined) {
        findWhatInput.value = searchText;
    }

    const replaceWithInput = document.querySelector('#replace_with');
    replaceAllButton = document.querySelector('#replace_all');
    const matchCaseCheckBox = document.querySelector('#match_case');

    replaceAllButton.addEventListener(StringLiterals.CLICK, () => {
        ipcRenderer.invoke(StringLiterals.SEARCH_AND_REPLACE, {
            'find_text': findWhatInput.value,
            'replace_text': replaceWithInput.value,
            'match_case': matchCaseCheckBox.checked
        }).then();
    });

    const closeButton = document.querySelector('#close');

    closeButton.addEventListener(StringLiterals.CLICK, async () => {
        window.close();
    });

    replaceAllButton.disabled = findWhatInput.value.trim().length === 0;

    findWhatInput.addEventListener('input', () => {
        enableDisableUI();
    });

    DialogBoxUtils.setupEscapeToClose();

    enableDisableUI();
    findWhatInput.focus();
}

function enableDisableUI() {
    replaceAllButton.disabled = findWhatInput.value.trim().length === 0;
}