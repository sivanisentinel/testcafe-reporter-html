/* eslint global-require: 0 */
/* eslint import/no-dynamic-require: 0 */

const fs = require('fs');

module.exports = () => ({
  noColors: true,
  startTime: null,
  afterErrList: false,
  uaList: null,
  report: '',
  table: '',
  tableReports: '',
  testCount: 0,
  skipped: 0,
  currentTestNumber: 1,
  serverUrl: '',
  currentFixturePath: '',

  reportTaskStart: function reportTaskStart(startTime, userAgents, testCount) {
    this.startTime = startTime;
    this.uaList = userAgents.join(', ');
    this.testCount = testCount;
  },

  reportFixtureStart: function reportFixtureStart(name, path, meta) {
    this.currentFixtureName = name;
    this.currentFixturePath = path;
    if (meta && meta.url) {
      this.serverUrl = `${meta.url}/login?username=${meta.username}&password=${meta.password}`;
    }
  },

  reportTestDone: function reportTestDone(name, testRunInfo) {
    const hasErr = !!testRunInfo.errs.length;
    const result = hasErr ? 'failed' : 'passed';

    if (testRunInfo.skipped) {
      this.skipped += 1;
    }

    this.compileTestTable(name, testRunInfo, hasErr, result);
    if (hasErr) {
      this.compileErrors(name, testRunInfo);
    }

    this.currentTestNumber += 1;
  },

  compileErrors: function compileErrors(name, testRunInfo) {
    const heading = `${this.currentTestNumber}. ${this.currentFixtureName} - ${name}`;

    this.report += this.indentString(`<h4 id="test-${this.currentTestNumber}">${heading}`);
    if (testRunInfo.screenshots) {
      testRunInfo.screenshots.forEach((screenshot) => {
        this.report += `&nbsp;&nbsp;<img class="thumbImg" src="data:image/png;base64, ${fs.readFileSync(screenshot.screenshotPath, {encoding: 'base64'})}"/>`;
      });
    }
    this.report += '</h4>\n';
    testRunInfo.errs.forEach((error) => {
      this.report += this.indentString('<pre>');
      this.report += this.escapeHtml(this.formatError(error, '')).replace('{', '&#123').replace('}', '&#125');
      this.report += this.indentString('</pre>');
    });
  },

  compileTestTable: function compileTestTable(name, testRunInfo, hasErr, result) {
    let rowClass = this.currentTestNumber % 2 === 0 ? 'even ' : 'odd ';
    if (hasErr) {
      rowClass = rowClass.concat(' danger');
    } else if (testRunInfo.skipped) {
      rowClass = rowClass.concat(' warning');
    } else {
      rowClass = rowClass.concat(' success');
    }
    this.tableReports += this.indentString(`<tr class=${rowClass}>\n`);

    const addTableCellFunction = (cellValue, cellClass = '') => {
      this.tableReports += this.indentString(`<td class=${cellClass}>`, 2);
      this.tableReports += cellValue;
      this.tableReports += '</td>\n';
    };
    // Number
    addTableCellFunction(this.currentTestNumber);

    // path
    addTableCellFunction(this.currentFixturePath);

    // Fixture
    addTableCellFunction(this.currentFixtureName);

    // Test
    addTableCellFunction(name);

    // Browsers
    addTableCellFunction(this.uaList, "browser-cell");

    // Duration
    addTableCellFunction(this.moment.duration(testRunInfo.durationMs).format('h[h] mm[m] ss[s]'));

    // Result
    let resultCellValue;
    if (testRunInfo.skipped) {
      resultCellValue = 'skipped';
    } else if (result === 'failed') {
      resultCellValue = 'failed';
    } else {
      resultCellValue = `<a href="#test-${this.currentTestNumber}">failed</a>`;
    }
    addTableCellFunction(resultCellValue);

    this.tableReports += '</td>\n';

    this.tableReports += this.indentString('</tr>\n');
  },

  reportTaskDone: function reportTaskDone(endTime, passed /* , warnings */) {
    const durationMs = endTime - this.startTime;
    const durationStr = this.moment.duration(durationMs).format('h[h] mm[m] ss[s]');
    const failed = this.testCount - passed;

    // Opening html
    let html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous">
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap-theme.min.css" integrity="sha384-rHyoN1iRsVXV4nD0JutlnGaslCJuC7uwjduW9SVrLvRYooPp2bWYgmgJQIXwl/Sp" crossorigin="anonymous">
    <link rel="stylesheet" href="https://cdn.rawgit.com/drvic10k/bootstrap-sortable/ff650fd1/Contents/bootstrap-sortable.css">
    <script
            src="https://code.jquery.com/jquery-3.3.1.min.js"
            integrity="sha256-FgpCb/KJQlLNfOu91ta32o/NMZxltwRo8QtmkMRdAu8="
            crossorigin="anonymous"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js" integrity="sha384-Tc5IQib027qvyjSMfHjOMaLkfuWVxZxUPnCJA7l2mCWNIpG9mGCD8wGNIcPD7Txa" crossorigin="anonymous"></script>
    <script src="https://cdn.rawgit.com/drvic10k/bootstrap-sortable/ff650fd1/Scripts/bootstrap-sortable.js"></script>
    <script src="https://cdn.rawgit.com/drvic10k/bootstrap-sortable/ff650fd1/Scripts/moment.min.js"></script>
    <style>
      body {font-family: Arial, Helvetica, sans-serif;}

      .thumbImg {
        width: 100%;
        max-width: 35px;
        border-radius: 3px;
        cursor: pointer;
        margin-bottom: 5px;
        border-width: 1px;
        border-color: #f1f1f1;
        border-style: solid;
      }

      .modal {
        display: none;
        position: fixed;
        z-index: 1;
        /*padding-top: 100px;*/
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: auto;
        background-color: rgba(0,0,0,0.7);
      }

      .modal-content {
        margin: auto;
        display: block;
        /*width: 80%;
        max-width: 700px;*/
      }

      .closeModal {
        position: absolute;
        top: 15px;
        right: 35px;
        color: #f1f1f1;
        font-size: 40px;
        font-weight: bold;
        transition: 0.3s;
      }

      .closeModal:hover,
      .closeModal:focus {
        cursor: pointer;
      }
      
      .browser-cell {
        white-space: nowrap;
      }
      
      .main-container {
        width: 95%;
        adding-right: 15px;
        padding-left: 15px;
        margin-right: auto;
        margin-left: auto;
      }
      .summary-panel{
        padding: 15px;
        border: 2px solid lightsteelblue;
        background-color: white;
        color: #337ab7;
        font-size: 16px;
      }
    </style>
  </head>
  <body>
    <div id="myModal" class="modal">
      <span class="closeModal">&times;</span>
      <img class="modal-content" id="modelImage">
    </div>
    <div class="main-container">
`;

    // Now add a summary
    html += `
      <h1 class="text-primary">TestCafe Test Summary</h1>
      <br>
      <div class="client-logo" style="padding:15px; display:none;"></div>
      <div class="summary-panel" style="padding:15px">
        <div>Start Time: ${this.startTime}</div>
        <div>Browsers: ${this.uaList}</div>
        <div>Duration: ${durationStr}</div>
        <div>Tests Failed: ${failed} out of ${this.testCount}</div>
        <div>Tests Skipped: ${this.skipped}</div>
        <div>Environment: <a href=${this.serverUrl}>${this.serverUrl}</a></div>
      </div><br>`;

    // Summary table
    html += `
      <table class="table sortable">
        <thead>
          <tr>
            <th>#</th>
            <th>Path</th>
            <th>Fixture</th>
            <th>Test Name</th>
            <th>Browsers</th>
            <th>Duration</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          ${this.tableReports}
        </tbody>
      </table>
      <br><br>
      `;

    // Error details
    html += `
      <h3>Error Details</h3>
      <br>
      ${this.report}`;

    // closing html
    html += `
    </div>
    <script>
      const modal = document.getElementById('myModal');
      const modalImage = document.getElementById("modelImage");

      Array.from(document.getElementsByClassName("thumbImg")).forEach(function(el) {
        el.onclick = function() {
          modal.style.display = "block";
          modalImage.src = this.src;
        }
      });
      
      document.getElementsByClassName("closeModal")[0].onclick = function() {
        modal.style.display = "none";
      }
    </script>
  </body>
</html>`;

    this.write(html);
  },
});
