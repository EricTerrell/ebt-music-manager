/*
  EBT Music Manager
  (C) Copyright 2023, Eric Bergman-Terrell

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

const StringLiterals = require('./stringLiterals');

module.exports = class DialogBoxUtils {
    static setupLinks() {
        document.querySelectorAll('.link').forEach(link => {
            link.addEventListener(StringLiterals.CLICK, (event) => {
                event.preventDefault();

                shell.openExternal(link.href).then();
            });
        });
    }

    static setupEscapeToClose() {
        document.addEventListener(StringLiterals.KEYDOWN, (event) => {
            if (event.key === StringLiterals.ESCAPE) {
                window.close();
            }
        });
    }
};