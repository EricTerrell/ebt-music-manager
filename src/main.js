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

const pkg = require('../package');

const remote = require('@electron/remote/main');
const {ipcMain, Menu, shell, dialog, app, BrowserWindow} = require('electron');
const path = require('path')

const StringLiterals = require('../lib/stringLiterals');
const WindowInfo = require('../lib/windowInfo');
const OSUtils = require('../lib/osUtils');
const MenuUtils = require('../lib/menuUtils');
const Constants = require('../lib/constants');
const Files = require('../lib/files');
const PowerManagement = require('../lib/powerManagement');

let checkForUpdatesEnabled = true;

remote.initialize();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

wireUpUI();

function wireUpUI() {
  const gotLock = app.requestSingleInstanceLock();

  if (!gotLock) {
    console.info(`wireUpUI: restricting app to single instance - stopping this instance`);

    app.quit();
  } else {
    app.on(StringLiterals.SECOND_INSTANCE, () => {
      console.info(`wireUpUI: ${StringLiterals.SECOND_INSTANCE}`);

      if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }

        mainWindow.focus();
      }
    });

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.on(StringLiterals.READY, createWindow);

    // Quit when all windows are closed.
    app.on(StringLiterals.WINDOW_ALL_CLOSED, function () {
      // On macOS it is common for applications and their menu bar
      // to stay active until the user quits explicitly with Cmd + Q
      if (process.platform !== StringLiterals.DARWIN) {
        app.quit()
      }
    });

    app.on(StringLiterals.ACTIVATE, function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) {
        createWindow()
      }
    });

    app.commandLine.appendSwitch('remote-debugging-port', '9222');
  }

  ipcMain.handle(StringLiterals.CHECK_FOR_UPDATES, async () => {
    checkForUpdates();
  });

  ipcMain.handle(StringLiterals.REJECT_LICENSE_TERMS, async () => {
    rejectLicenseTerms();
  });

  ipcMain.handle(StringLiterals.ACCEPT_LICENSE_TERMS, async () => {
    acceptLicenseTerms();
  })
}

function createMenus(window) {
  const template = [
    {
      label: '&File',
      submenu: [
        OSUtils.isMac() ? { role: 'close' } : { label: 'E&xit', role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: '&Help',
      submenu: [
        {
          label: 'On-Line &Help', click() { onLineHelp(); }
        },
        {
          type: StringLiterals.MENU_SEPARATOR
        },
        {
          label: '&Visit EricBT.com', click() { visitEricBT(); }
        },
        {
          type: StringLiterals.MENU_SEPARATOR
        },
        {
          label: 'Check for &Updates', click() { checkForUpdates(); }
        },
        {
          type: StringLiterals.MENU_SEPARATOR
        },
        {
          label: 'Email &Feedback', click() { feedback(); }
        },
        {
          type: StringLiterals.MENU_SEPARATOR
        },
        {
          label: `&About ${StringLiterals.APP_NAME}`, click() { about(); }
        }
      ]
    }
  ];

  if (!OSUtils.isMac()) {
    const editIndex = template.findIndex((element) => element.label === 'Edit');

    delete template[editIndex];
  }

  if (MenuUtils.displayCustomMenus()) {
    const menu = Menu.buildFromTemplate(template);

    if (process.platform !== StringLiterals.DARWIN) {
      // Don't use Menu.setApplicationMenu: if you do, on Linux, every window will have the menu.
      window.setMenu(menu);
    } else {
      Menu.setApplicationMenu(menu);
    }
  }
}

function checkForUpdates() {
  if (checkForUpdatesEnabled) {
    checkForUpdatesEnabled = false;

    const windowId = 'check_for_updates';

    const windowInfo = WindowInfo.loadWindowInfo(windowId);

    const checkForUpdatesWindow = new BrowserWindow({
      width: windowInfo.width,
      height: windowInfo.height,
      parent: mainWindow,
      modal: false,
      x: windowInfo.x,
      y: windowInfo.y,
      webPreferences: {
        enableRemoteModule: true,
        nodeIntegration: true,
        contextIsolation: false,
        preload: path.join(__dirname, 'preload.js')
      }
    });

    MenuUtils.disableMenus(checkForUpdatesWindow);

    // and load the index.html of the app.
    checkForUpdatesWindow.loadFile('check_for_updates.html').then();

    checkForUpdatesWindow.on(StringLiterals.RESIZE, (event) => {
      WindowInfo.saveWindowInfo(windowId, checkForUpdatesWindow);
    });

    checkForUpdatesWindow.on(StringLiterals.MOVE, (event) => {
      WindowInfo.saveWindowInfo(windowId, checkForUpdatesWindow);
    });

    checkForUpdatesWindow.on(StringLiterals.CLOSE, () => {
      checkForUpdatesEnabled = true;
    });
  }
}

function onLineHelp() {
  shell.openExternal(pkg.config.onLineHelpUrl).then();
}

function feedback() {
  shell.openExternal(pkg.config.submitFeedback).then();
}

function createWindow () {
  if (MenuUtils.displayCustomMenus()) {
    Menu.setApplicationMenu(null);
  }

  // Create the browser window.
  const windowId = 'main';

  const windowInfo = WindowInfo.loadWindowInfo(windowId);

  mainWindow = new BrowserWindow({
    title: StringLiterals.APP_NAME,
    width: windowInfo.width,
    height: windowInfo.height,
    x: windowInfo.x,
    y: windowInfo.y,
    webPreferences: {
      enableRemoteModule: true,
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (windowInfo.isMaximized) {
    mainWindow.maximize();
  }

  remote.enable(mainWindow.webContents);

  // and load the index.html of the app.
  mainWindow.loadFile('index.html').then();

  // Emitted when the window is closed.
  mainWindow.on(StringLiterals.CLOSED, function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  });

  // Emitted when the window is closed.
  mainWindow.on(StringLiterals.CLOSED, function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  });

  mainWindow.on(StringLiterals.RESIZE, (event) => {
    WindowInfo.saveWindowInfo(windowId, mainWindow);
  });

  mainWindow.on(StringLiterals.MOVE, (event) => {
    WindowInfo.saveWindowInfo(windowId, mainWindow);
  });

  createMenus(mainWindow);

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

ipcMain.handle(StringLiterals.NOTIFY_SETTINGS_CHANGED, async () => {
  console.log(`main.js: received "${StringLiterals.NOTIFY_SETTINGS_CHANGED}" notification`);

  mainWindow.webContents.send(StringLiterals.NOTIFY_SETTINGS_CHANGED);
});

function visitEricBT() {
  shell.openExternal(pkg.config.websiteUrl).then();
}

function about() {
  const windowId = 'about';

  const windowInfo = WindowInfo.loadWindowInfo(windowId);

  const aboutWindow = new BrowserWindow({
    title: `About ${StringLiterals.APP_NAME}`,
    width: windowInfo.width,
    height: windowInfo.height,
    parent: mainWindow,
    modal: true,
    x: windowInfo.x,
    y: windowInfo.y,
    webPreferences: {
      enableRemoteModule: true,
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  remote.enable(aboutWindow.webContents);

  MenuUtils.disableMenus(aboutWindow);

  // and load the index.html of the app.
  aboutWindow.loadFile('about.html').then();

  aboutWindow.on(StringLiterals.RESIZE, (event) => {
    WindowInfo.saveWindowInfo(windowId, aboutWindow);
  });

  aboutWindow.on(StringLiterals.MOVE, (event) => {
    WindowInfo.saveWindowInfo(windowId, aboutWindow);
  });
}

function rejectLicenseTerms() {
  const options = {
    type: StringLiterals.DIALOG_INFO,
    title: `Rejected ${StringLiterals.APP_NAME} License Terms`,
    message: `You rejected the ${StringLiterals.APP_NAME} license terms. Please uninstall ${StringLiterals.APP_NAME} immediately.`,
    buttons: Constants.OK
  };

  dialog.showMessageBoxSync(options);

  Files.saveLicenseTerms({userAccepted: false});

  app.exit(0);
}

function acceptLicenseTerms() {
  Files.saveLicenseTerms({userAccepted: true});
}

let busyWindow;

function busy(busy, message) {
  if (busy) {
    busyWindow = createBusyWindow(message);
    remote.enable(busyWindow.webContents);

    busyWindow.setMinimizable(false);
    busyWindow.setMaximizable(false);
    busyWindow.setClosable(false);

    mainWindow.setEnabled(false);
  } else {
    busyWindow.setClosable(true);
    busyWindow.close();

    busyWindow = undefined;

    mainWindow.setEnabled(true);
  }
}


ipcMain.handle(StringLiterals.BUSY, async (event, data) => {
  busy(data.displayDialog, data.message);
});

ipcMain.handle(StringLiterals.PROCESSING_COMPLETE, () => {
  if (busyWindow && busyWindow.__PID__ !== undefined) {
    PowerManagement.allowSleep(busyWindow.__PID__);

    busyWindow.__PID__ = undefined;
  }
});

ipcMain.handle(StringLiterals.PROGRESS_MESSAGE, async (event, data) => {
  if (busyWindow !== undefined) {
    busyWindow.webContents.send(StringLiterals.PROGRESS_MESSAGE, data);
  }
});

ipcMain.handle(StringLiterals.BUSY_DIALOG_CONFIGURE, async (event, options) => {
  if (busyWindow !== undefined) {
    busyWindow.webContents.send(StringLiterals.BUSY_DIALOG_CONFIGURE, options);
  }
});

ipcMain.handle(StringLiterals.UPSERT_PLAYLIST, async (event, data) => {
  mainWindow.webContents.send(StringLiterals.UPSERT_PLAYLIST, data);
});

function createBusyWindow(message) {
  const windowId = 'busy';

  const windowInfo = WindowInfo.loadWindowInfo(windowId);

  const busyWindow = new BrowserWindow({
    title: 'Processing',
    width: windowInfo.width,
    height: windowInfo.height,
    x: windowInfo.x,
    y: windowInfo.y,
    parent: mainWindow,
    modal: false,
    webPreferences: {
      enableRemoteModule: true,
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  try {
    busyWindow.__PID__ = PowerManagement.preventSleep();
  } catch (error) {
    console.error(error);
  }

  remote.enable(busyWindow.webContents);

  busyWindow.webContents.on(StringLiterals.DID_FINISH_LOAD, () => {
    console.log('busyWindow: did-finish-load');

    busyWindow.webContents.send(StringLiterals.PROGRESS_MESSAGE, { message });
  });

  // and load the index.html of the app.
  busyWindow.loadFile('busy.html').then();

  busyWindow.webContents.on('did-fail-load', () => {
    console.warn('busyWindow: did-fail-load');
  });

  busyWindow.on(StringLiterals.RESIZE, (event) => {
    WindowInfo.saveWindowInfo(windowId, busyWindow);
  });

  busyWindow.on(StringLiterals.MOVE, (event) => {
    WindowInfo.saveWindowInfo(windowId, busyWindow);
  });

  busyWindow.webContents.on('close', () => {
    console.log('busyWindow close');

    if (busyWindow.__PID__ !== undefined) {
      try {
        PowerManagement.allowSleep(busyWindow.__PID__);

        busyWindow.__PID__ = undefined;
      } catch (error) {
        console.error(error);
      }
    }
  });

  return busyWindow;
}
