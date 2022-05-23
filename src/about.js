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

const {shell} = require("electron");

const {config} = require('./package.json');

const StringLiterals = require('./lib/stringLiterals');
const AppInfo = require('./lib/appInfo');
const WindowUtils = require('./lib/windowUtils');
const DialogBoxUtils = require('./lib/dialogBoxUtils');

wireUpUI();

function wireUpUI() {
    const licenseTermsButton = document.querySelector('#license_terms');
    const closeButton = document.querySelector('#close');

    document.querySelector('#github').setAttribute(StringLiterals.HREF, config.githubUrl);
    document.querySelector('#website_link').innerText = config.websiteUrl;
    document.querySelector('#website_link').setAttribute(StringLiterals.HREF, config.websiteUrl);

    document.querySelector('#app_and_version').innerText = `${StringLiterals.APP_NAME} version ${AppInfo.getInfo.version}`;

    closeButton.addEventListener(StringLiterals.CLICK, () => {
        window.close();
    });

    DialogBoxUtils.setupLinks();
    DialogBoxUtils.setupEscapeToClose();

    licenseTermsButton.addEventListener(StringLiterals.CLICK, () => {
        WindowUtils.createWindow('license_terms', () => {licenseTermsButton.disabled = false});
    });

    document.querySelector('#feedback').addEventListener(StringLiterals.CLICK, () => {
        shell.openExternal(config.submitFeedback).then();
    });
}
