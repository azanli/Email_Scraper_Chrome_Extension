'use strict';

chrome.storage.local.get(['ssURL'], function(result) {
  alert(result['ssURL'])
  if (result['ssURL']) {
    document.getElementById('url-input').value = result['ssURL'];
  }
});

const state = {
  names: true,
  logs: true,
  script: 'https://script.google.com/macros/s/AKfycbwE3ELgyoCZPLd2tg6RxQuqX8tHJ4uiytbVxGLO9U7Z8YHOGnI/exec',
};

function toggleNames(toggle) {
  if (toggle === 'on') {
    document.getElementById('names-on').style['background-color'] = '#4285F4';
    document.getElementById('names-off').style['background-color'] = '#d3d3d3';
    state['names'] = true;
  } else {
    document.getElementById('names-off').style['background-color'] = '#4285F4';
    document.getElementById('names-on').style['background-color'] = '#d3d3d3';
    state['names'] = false;
  }
}

function toggleLogs(toggle) {
  if (toggle === 'on') {
    document.getElementById('logs-on').style['background-color'] = '#4285F4';
    document.getElementById('logs-off').style['background-color'] = '#d3d3d3';
    state['logs'] = true;
  } else {
    document.getElementById('logs-off').style['background-color'] = '#4285F4';
    document.getElementById('logs-on').style['background-color'] = '#d3d3d3';
    state['logs'] = false;
  }
}

function loadSpinner() {
  document.getElementById('start-loader').style.display = 'block';
  document.getElementById('start-text').style.display = 'none';
}

function hideSpinner(document) {
  document.getElementById('start-loader').style.display = 'none';
  document.getElementById('start-text').style.display = 'block';

}

document.addEventListener('DOMContentLoaded', function() {

  const toggleNamesOn = document.getElementById('names-on');
  toggleNamesOn.addEventListener('click', function() {
      toggleNames('on');
  });

  const toggleNamesOff = document.getElementById('names-off');
  toggleNamesOff.addEventListener('click', function() {
      toggleNames('off');
  });

  const toggleLogsOn = document.getElementById('logs-on');
  toggleLogsOn.addEventListener('click', function() {
      toggleLogs('on');
  });

  const toggleLogsOff = document.getElementById('logs-off');
  toggleLogsOff.addEventListener('click', function() {
      toggleLogs('off');
  });

  const startHandler = document.getElementById('start-button');
  startHandler.addEventListener('click', function() {
    chrome.tabs.getSelected(null, function(tab) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.executeScript(tab.id, {"file": "dialog.js"}, function() {
          chrome.tabs.sendMessage(tab.id, {
            logs: state.logs,
            names: state.names,
            script: state.script,
            ssURL: document.getElementById('url-input').value,
            tabId: tab.id,
          });
          loadSpinner();
          if (document.getElementById('url-input').value) {
            chrome.storage.sync.set({ ssURL: document.getElementById('url-input').value }, function() {
              alert(`saved ssurl ${document.getElementById('url-input').value}`)
            });
          }
        });
      });
    });
  });

});