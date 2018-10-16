(function() {

  chrome.extension.onMessage.addListener(function(message) {
    const {
      logs,
      names,
      script,
      ssURL,
    } = message;

    if (!ssURL) {
      return;
    }

    class Email_Scraper {
      constructor(log = false, names = true, scriptURL = '', spreadsheetURL = '') {
        this.currIndex = 0;
        this.log = log;
        this.names = names;
        this.pendingRecursive = 1;
        this.scriptURL = scriptURL;
        this.spreadsheetURL = spreadsheetURL;
        this.sourceIndex = 0;
        this.sources = {};
      }
    
      traverseDOM(email, dom = document.body) {
        if (dom.childNodes.length === 0) {
          let tmp = document.createElement("div");
          tmp.appendChild(dom.cloneNode(false));
          const value = tmp.innerHTML;
          
          if (value.length <= 30 && value.includes('.')) {
            let indexAt = -1;
            if (email) {
              indexAt = value.indexOf(email);
            } else {
              indexAt = value.indexOf('@');
            }
            if (indexAt > -1) {
              const name = value.substr(0, indexAt);
              const alphaMap = {};
              for (let i = 0; i < indexAt; i++) {
                alphaMap[value[i]] = true;
              }
              this.sources[this.sourceIndex] = {
                name,
                email: value,
                score: 0,
                alphaMap,
              }
              this.sourceIndex++;
            }
          }
        } else if (dom.childNodes.length) {
          for (let i = 0; i <= dom.childNodes.length; i += 1) {
            if (dom.childNodes[i]) {
              this.pendingRecursive++;
              this.traverseDOM(email, dom.childNodes[i]);
            }
          }
        }
        if (--this.pendingRecursive <= 0) {
          this.pendingRecursive = 1;
          if (this.log && !this.names) {
            for (let key in this.sources) {
              console.log(this.sources[key]['email']);
            }
          }
          if (this.names) {
            this.traverseAgainForNames(document.body);
          } else {
            this.submitDataToSpreadsheet();
          }
        }
      };
    
      traverseAgainForNames(dom) {
        if (this.sourceIndex === 0) return;
        if (dom.childNodes.length === 0) {
          let tmp = document.createElement("div");
          tmp.appendChild(dom.cloneNode(false));
          const value = tmp.innerHTML;
          try {
            if (value.charCodeAt(0) >= 65 && value.charCodeAt(0) <= 90 && value.length < 30 && value.length >= 5) { // Greater than 30 characters may be a sentence rather than a name.
              Object.keys(this.sources).some(index => {
                if (this.sources[index]['score'] > 100) return; 
      
                let name = this.sources[index]['name'];
                // Incase the name has numbers appended to their last names.
                let lastIndex = name.length - 1;
                if (!isNaN(parseInt(name[lastIndex]))) {
                  while (!isNaN(parseInt(name[lastIndex]))) {
                    lastIndex--;
                  }
                }
      
                const lowerCaseName = name.toLowerCase();
                const lowerCaseValue = value.toLowerCase();
                if (lowerCaseName[lastIndex] === lowerCaseValue[value.length - 1] && 
                lowerCaseName[lastIndex - 1] === lowerCaseValue[value.length - 2] && 
                (lowerCaseName[lastIndex - 2] === lowerCaseValue[value.length - 3] || lowerCaseName[lastIndex - 2] === lowerCaseValue[0])) {
                  if (lowerCaseName[0] === lowerCaseValue[0]) {
                    
                    let parsedValue = value;
                    while (parsedValue.includes('nbsp')) {
                      if (parsedValue.includes('&nbsp;')) {
                        parsedValue = parsedValue.replace('&nbsp;', ' ');
                      } else if (parsedValue.includes('&nbsp')) {
                        parsedValue = parsedValue.replace('&nbsp', ' ');
                      } else if (parsedValue.includes('nbsp;')) {
                        parsedValue = parsedValue.replace('nbsp;', ' ');
                      } else {
                        parsedValue = parsedValue.replace('nbsp', ' ');                  
                      }
                    }
      
                    if (lowerCaseValue[0] === 'm' && (lowerCaseValue[1] === 'r' || lowerCaseValue[1] === 's')) {
                      parsedValue = parsedValue.substr(parsedValue.indexOf(' ') + 1);
                    }
      
                    let count = 0;
                    for (let i = 0; i < parsedValue.length; i++) {
                      if (this.sources[index]['alphaMap'][parsedValue[i]]) count += 1;
                    }
                    const newScore = (count / Object.keys(this.sources[index]['alphaMap']).length) * 100;
                    if (newScore > this.sources[index]['score']) {
                      if (this.log) console.log('New score:', newScore, 'Old score:', this.sources[index]['score']);
                      if (this.log) console.log('Changing name from', name, 'to', parsedValue);
                      this.sources[index]['name'] = parsedValue;
                      this.sources[index]['score'] = newScore;
                      return true;
                    }
                  }
                }
              });
            }
          } catch(e) {
            console.error(`Error occurred while traversing for names: ${e}`)
          }
        } else {
          for (let i = 0; i <= dom.childNodes.length; i += 1) {
            if (dom.childNodes[i]) {
              this.pendingRecursive++;
              this.traverseAgainForNames(dom.childNodes[i]);
            }
          }
        }
        if (--this.pendingRecursive <= 0) {
          this.pendingRecursive = 1;
          if (this.log) console.log('Names & Emails:', this.sources);
          if (this.spreadsheetURL && this.sourceIndex > 0) {
            this.submitDataToSpreadsheet();
          }
        }
        return;
      };
    
      submitDataToSpreadsheet() {
        let throttle = 0;
        for (let i = 0; i < this.sourceIndex; i += 1) {
          try {
            // if (this.currIndex >= this.sourceIndex) return;

            let firstName = '';
            let lastName = '';
            if (this.names) {
              let name = this.sources[i]['name'];
              if (this.includesSpecialChars(name)) {
                name = this.replaceSpecialChars(name);
              }
              if (name.charCodeAt(0) >= 97 && name.charCodeAt(0) <= 122) {
                name = this.fixLowerCaseName(name);
              }
              firstName = name;
              const lastNameIndex = name.indexOf(' ');
              if (lastNameIndex > 0) {
                firstName = name.substr(0, lastNameIndex);
                const middleNameIndex = name.lastIndexOf(' ');
                if (lastNameIndex === middleNameIndex) {
                  lastName = name.substr(lastNameIndex + 1);
                } else {
                  lastName = name.substr(middleNameIndex + 1);
                }
              }
            }

            const data = {
              'First Name': firstName,
              'Last Name': lastName,
              'Email Address': this.sources[i]['email'],
              'Spreadsheet URL': this.spreadsheetURL,
            }
            setTimeout(() => {
              this.handleSpreadsheetSubmit(data);
            }, throttle += 2000);
            // this.currIndex++;
            // this.handleSpreadsheetSubmit(data);
          } catch(e) {
            console.error(`Error submitting data to spreadsheet: ${e}`)
          }
          setTimeout(() => {
            chrome.runtime.sendMessage('hideSpinner');
          }, 2000 * (this.sourceIndex - 1));
        }
        chrome.runtime.sendMessage(`${Date.now() + (2000 * (this.sourceIndex - 1))}`);
      };
    
      handleSpreadsheetSubmit(data = {}) {
        // data = {
        //   'First Name': 'Test',
        //   'Last Name': 'Testing',
        //   'Email Address': 'test@testing.com',
        //   'Spreadsheet URL': 'https://docs.google.com/spreadsheets/d/test_example',
        // };
    
        const xhr = new XMLHttpRequest();
        // const proxyurl = "https://cors-anywhere.herokuapp.com/";
        const url = this.scriptURL;
        xhr.open('POST', url, true);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        // xhr.onreadystatechange = () => {
          // if (this.log) console.log(xhr.status, xhr.statusText);
          // if (this.log) console.log(xhr.responseText);
          // this.submitDataToSpreadsheet();
          // return;
        // };
        const encoded = Object.keys(data).map(function(k) {
          return encodeURIComponent(k) + "=" + encodeURIComponent(data[k]);
        }).join('&');
        xhr.send(encoded);
      }; 
    
      includesSpecialChars(str) {
        return /[^A-Za-z\s]/g.test(str);
      }
    
      replaceSpecialChars(str) {
        return str.replace(/[^A-Za-z\s]/g, ' ');
      }
    
      fixLowerCaseName(str) {
        let fixedName = '' + str[0].toUpperCase();
        for (let i = 1; i < str.length; i++) {
          if (str[i] === ' ') {
            fixedName += ' ' + str[i + 1].toUpperCase();
            i += 1;
          }
          fixedName += str[i];
        }
        return fixedName;
      }
    }
    const email_scraper = new Email_Scraper(logs, names, script, ssURL);
    email_scraper.traverseDOM();
  })
})();

