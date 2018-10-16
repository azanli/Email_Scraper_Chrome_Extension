'use strict';

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-127582009-1']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

const state = {
  names: true,
  logs: true,
  script: 'https://script.google.com/macros/s/AKfycbwE3ELgyoCZPLd2tg6RxQuqX8tHJ4uiytbVxGLO9U7Z8YHOGnI/exec',
  ssURL: '',
};

chrome.storage.sync.get(['ssURL', 'spinnerExpireDate', 'tabId'], function(result) {
  if (result['ssURL']) {
    document.getElementById('url-input').value = result['ssURL'];
    state.ssURL = result['ssURL'];
  }
  if (result['spinnerExpireDate'] && Date.now() < result['spinnerExpireDate']) {
    chrome.tabs.getSelected(null, function(tab) {
      if (tab.id === result['tabId']) {
        loadSpinner();
        setTimeout(hideSpinner, result['spinnerExpireDate'] - Date.now());
      }
    });
  }
});

function saveTime(time) {
  chrome.storage.sync.set({ spinnerExpireDate: time });
}

function saveTabId(tabId) {
  chrome.storage.sync.set({ tabId });
}

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
  state.loading = true;
}

function hideSpinner() {
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
    const ssURL = document.getElementById('url-input').value;
    if (!ssURL) {
      document.getElementById("url-input").focus();
      if (state.ssURL) {
        chrome.storage.sync.set({ ssURL: '' }, function() {
          console.log(`Removed Google Spreadsheet URL from storage.}`)
        });
      }
      return;
    }
    loadSpinner();
    if (state.ssURL !== ssURL) {
      chrome.storage.sync.set({ ssURL }, function() {
        console.log(`Google Spreadsheet URL saved as: ${ssURL}`)
      });
      state.ssURL = ssURL;
    }
    chrome.tabs.getSelected(null, function(tab) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.executeScript(tab.id, {
          "file": "content.js"
        }, function() {
          chrome.tabs.sendMessage(tab.id, {
            logs: state.logs,
            names: state.names,
            script: state.script,
            ssURL: state.ssURL,
          });
          chrome.tabs.connect(tab.id, { name: 'Hide Spinner Channel'});
          saveTabId(tab.id);
          chrome.runtime.onMessage.addListener(function(message) {
            if (message === 'hideSpinner') hideSpinner();
            if (!isNaN(parseInt(message))) saveTime(parseInt(message)); 
          });
        });
      });
    });
    _gaq.push(['_trackEvent', 'Start button', 'clicked']);
  });

});
