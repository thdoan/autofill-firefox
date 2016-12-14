/*
 * @package Autofill
 * @author Tom Doan
 * @copyright (c) Tom Doan
 * @license MIT License
 * @link http://www.tohodo.com/
 */

// Add method to get object size (length)
Object.size = function(o) {
  var n = 0;
  for (var i in o) {
    if (o.hasOwnProperty(i)) n++;
  }
  return n;
};

// Define global variables
var nVer = '3.6',
  D = document,
  Cc = Components.classes,
  Ci = Components.interfaces,
  P = Cc['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefBranch),
  SS = Ci.nsISupportsString,
  F, FP, W,
  sAP = 'autofill-panel-',
  sX = 'extensions.autofill.',
  sV = sX + 'ver',
  sR = sX + 'rules',
  sRC = sX + 'rulecount',
  sC = sX + 'cats',
  sCC = sX + 'catcount',
  sCI = sX + 'catnow',
  sE = sX + 'exceptions',
  oAO,
  oR, nR,
  oRLB, oC2, oC3, oC4,
  oBRR, oBRU, oBRD, oBRM, oBRS,
  aC, nC, nCI,
  oC, sCN, oCS, oCO,
  oBCR, oBCD,
  oCCT, oCCB,
  oTB,
  oOO,
  oD, oDO,
  oNB,
  oSB,
  bRC = false, bCC = false,
  bMac = navigator.platform.indexOf('Mac')>-1;

// Add table row
// n : rule ID
function addRow(n, nSel, sName, sValue, sSite, sCat) {
  var oRLI = oRLB.appendChild(D.createElement('richlistitem')),
    oML = oRLI.appendChild(D.createElement('menulist')),
    oTB1 = oRLI.appendChild(D.createElement('textbox')),
    oTB2 = oRLI.appendChild(D.createElement('textbox')),
    oTB3 = oRLI.appendChild(D.createElement('textbox')),
    oElm = oRLI.firstChild,
    sCatTooltip,
    sBoxTooltip = oSB.getString('boxTooltip');
  // Get profile name for tooltip
  if (nCI==0) {
    if (sCat=='all' || !sCat) sCatTooltip = 'Profile: Unfiled\n';
    else {
      for (var i=0, imax=aC.length; i<imax; i++) {
        if (sCat==aC[i].k) {
          sCatTooltip = 'Profile: ' + aC[i].n + '\n';
          break;
        }
      }
    }
  }
  oRLI.id = 'r_' + n;
  oRLI.cat = (sCat && sCat!='all') ? sCat : '';
  oML.id = 't_' + n;
  oML.width = 104;
  oML.appendChild(D.createElement('menupopup'));
  oML.appendItem('Text');
  oML.appendItem('Password');
  oML.appendItem('Select');
  oML.appendItem('Checkbox/Radio');
  oML.appendItem('Hidden');
  oML.appendItem('Button');
  oML.selectedIndex = nSel || 0;
  oML.setAttribute('oncommand', 'validRow(this)');
  oTB1.id = 'n_' + n;
  oTB1.setAttribute('value', sName || '');
  oTB2.id = 'v_' + n;
  if (nSel==1 && oOO['mask'].checked) {
    oTB2.setAttribute('type', 'password');
  } else if (nSel==5) {
    oTB2.value = '*click*';
    oTB2.setAttribute('disabled', 'disabled');
  }
  oTB2.setAttribute('value', sValue || '');
  oTB3.id = 's_' + n;
  oTB3.setAttribute('value', sSite || '');
  oTB3.setAttribute('maxwidth', '155');
  // Add common attributes to textboxes
  while (oElm) {
    // Show profile in tooltip for "All" profile
    oElm.setAttribute('tooltiptext', (sCatTooltip||'') + ((oElm.nodeName=='textbox'&&nSel!=5)?sBoxTooltip:''));
    if (oElm.nodeName=='textbox') {
      oElm.flex = 1;
      oElm.setAttribute('onclick', 'showEditBox(this, event)');
      oElm.setAttribute('onkeydown', 'showEditBox(this, event)');
      oElm.setAttribute('onkeyup', 'validRow(this)');
    }
    oElm = oElm.nextSibling;
  }
  // Execute only if Add button is clicked
  if (!sName && !sValue) {
    alignHeaders();
    // Select newly added row and put focus on Name column
    oRLB.ensureElementIsVisible(oRLI);
    oRLB.selectedItem = oRLI;
    oTB1.focus();
    oBRS.disabled = false;
  }
}

// Fix column header alignment
function alignHeaders() {
  var w = oRLB.childNodes[1].childNodes[1].clientWidth;
  // Decrease list box height if necessary
  if (oAPF.clientHeight-oRLB.clientHeight<101) {
    oRLB.setAttribute('maxheight', oAPF.clientHeight - oCCT.clientHeight - oCCB.clientHeight - 22);
  }
  // Need to reset header widths to allow cell widths to shrink
  oC2.width = 0;
  oC3.width = 0;
  oC2.width = w + 12;
  oC3.width = w + 11;
}

// Build Form Fields table
function buildRules(sCat) {
  if (P.prefHasUserValue(sR)) {
    // Delete unsaved rows
    removeAllRows();
    // Build saved options
    for (var i in oR) {
      if (sCat=='all' || sCat==oR[i].c) addRow(+i.slice(1), oR[i].t, oR[i].n, oR[i].v, oR[i].s, oR[i].c);  // extract # from r#
    }
    // Adjust column headers for scrollbar
    alignHeaders();
  }
}

// Filter rules by profile (category)
// nCat : optional; change to this profile, discarding changes
function changeCat(nCat) {
  var sCaller = arguments.callee.caller.name;
  // Don't do anything if reselecting current item
  if (arguments.callee.caller.name=='oncommand' && nCI==oC.selectedIndex) return;
  // Execute these only when selecting from profile list
  if (sCaller=='oncommand') {
    // Save profile site filter and overwrite option
    saveOptions('cats');
  }
  // Show confirmation if data not saved yet
  if (bRC) {
    var oParam = {
      i: {
        desc: 'changedRules',
        type: 'confirmChange'
      },
      o: null
    };
    window.openDialog('chrome://autofill/content/confirm.xul', '', 'centerscreen, chrome, dialog, modal', oParam);
    if (!oParam.o) {
      oC.selectedIndex = nCI;
      return;
    }
  }
  if (nCat==undefined) nCI = oC.selectedIndex;
  else oC.selectedIndex = (nCI=nCat);
  sCN = oC.getItemAtIndex(nCI).value;
  // Show autofill rules for this profile
  buildRules(sCN);
  // Disable controls when appropriate
  var bDef = (nCI<2);
  oBCR.disabled = bDef;
  oBCD.disabled = bDef;
  oCS.disabled = bDef;
  oCO.disabled = bDef;
  // Load profile site filter and overwrite option
  oCS.value = (!bDef) ? (aC[nCI-2].s||'') : '';
  oCO.checked = (!bDef) ? aC[nCI-2].o : 0;
  // Execute these only when selecting from profile list
  if (sCaller=='oncommand') {
    // Save current profile index
    P.setIntPref(sCI, nCI);
    bRC = false;
    if (!bRC && !bCC) oBRS.disabled = true;
  }
}

// Normalize Site Filter and Exceptions data
function cleanText(s) {
  s = s.replace(/[\r\n]{2,}/g, '\n');
  s = s.replace(/^\s+|\s+$/gm, '');
  return s;
}

// Delete profile
function deleteCat() {
  var oParam = {
    o: null
  };
  if (oOO['confirm'].checked) window.openDialog('chrome://autofill/content/catdelete.xul', '', 'centerscreen, chrome, dialog, modal', oParam);
  if (oParam.o || !oOO['confirm'].checked) {
    var oSites = {};
    // Save rules first
    saveOptions('rules');
    // Delete profile from aC
    for (var i=0, imax=aC.length; i<imax; i++) {
      if (i==nCI-2) {
        if (aC[i].s) oSites[aC[i].k] = aC[i].s;
        aC.splice(i, 1);
        break;
      }
    }
    // Move all orphaned rules to Unfiled
    for (var i in oR) {
      if (aC.length>0) {
        for (var j=0, jmax=aC.length; j<jmax; j++) {
          if (oR[i].c==aC[j].k) break;
          if (j==jmax-1) {
            if (!oR[i].s) oR[i].s = oSites[oR[i].c] || '';
            oR[i].c = '';
          }
        }
      } else {
        if (!oR[i].s) oR[i].s = oSites[oR[i].c] || '';
        oR[i].c = '';
      }
    }
    // Switch to Unfiled
    changeCat(1);
    // Refresh profile list
    popCats();
    saveOptions('cats');
    saveOptions('rules');
    if (oParam.o) P.setBoolPref(sX + 'confirm', !oParam.o.confirm);
  }
}

// Register keyboard shortcuts
function doKeyDown(e) {
  var bFields = (oAO.currentPane.id==sAP + 'fields');
  // Ctrl+A on Win/Linux or Command+A on Mac to select all
  if (((!bMac && e.ctrlKey) || (bMac && e.metaKey)) && e.keyCode==65) {
    if (bFields) oRLB.selectAll();
  } else if ((!bMac)?e.altKey:e.ctrlKey) {
    switch (e.keyCode) {
      case 38:  /* Alt|Ctrl+Up */
        if (bFields) rowUp();
        break;
      case 40:  /* Alt|Ctrl+Down */
        if (bFields) rowDown();
        break;
      case 70:  /* Alt|Ctrl+F */
        oAO.showPane(D.getElementById(sAP + 'fields'));
        break;
      case 79:  /* Alt|Ctrl+O */
        oAO.showPane(D.getElementById(sAP + 'other'));
        break;
      case 88:  /* Alt|Ctrl+X */
        oAO.showPane(D.getElementById(sAP + 'exceptions'));
        break;
      case 191:  /* Alt|Ctrl+? (/) */
        oAO.showPane(D.getElementById(sAP + 'support'));
        break;
    }
  }
}

// Export settings to CSV file
function exportCSV() {
  var sExportDialog = oSB.getString('exportDialog');
  FP.init(window, sExportDialog, F.modeSave);
  FP.defaultExtension = 'csv';
  if (FP.show()!=F.returnCancel) {
    var fstream = Cc['@mozilla.org/network/file-output-stream;1'].createInstance(Ci.nsIFileOutputStream),
      cstream = Cc['@mozilla.org/intl/converter-output-stream;1'].createInstance(Ci.nsIConverterOutputStream),
      sData = '### PROFILES ###,,,,\r\nProfile ID,Name,Site,Overwrite,\r\n';
    // Turn off notifications
    oNB.removeAllNotifications();
    // Begin writing to file stream...
    fstream.init(FP.file, -1, -1, 0);
    cstream.init(fstream, 'UTF-8', 0, 0);
    // Export profiles
    for (var i=0, imax=aC.length; i<imax; i++) {
      sData += aC[i].k + ',' + aC[i].n + ',' + aC[i].s + ',' + aC[i].o + ',\r\n';
    }
    sData += '### AUTOFILL RULES ###,,,,\r\nType,Name,Value,Site,Profile\r\n';
    // Export rules
    for (var i in oR) {
      sData += oR[i].t + ',"' + oR[i].n.replace(/"/g, '""') + '","' + oR[i].v.replace(/"/g, '""') + '","' + oR[i].s.replace(/"/g, '""') + '",' + oR[i].c + '\r\n';
    }
    // Export exceptions
    sData += '### THE REST ###,,,,\r\nexceptions,"' + JSON.stringify(P.getComplexValue(sE, SS).data.split('\n')).replace(/"/g, '""') + '",,,';
    // Export options
    for (var i in oOO) {
      sData += '\r\n' + i + ',' + (+P.getBoolPref(sX + i));
      switch (i) {
        case 'delay':
          sData += ',' + (P.getCharPref(sX + i + 'sec')) + ',,';
          break;
        default:
          sData += ',,,';
      }
    }
    cstream.writeString(sData);
    // Close file stream
    cstream.close();
  }
}

// Handle button states on rule selection
function handleSelect(e) {
  var sSI = '';
  oBRR.disabled = (oRLB.selectedCount==0);
  for (var i=oRLB.itemCount, a=oRLB.childNodes, sN; i>0; i--) {
    if (a[i].selected) {
      sSI += '[' + i + ']';
      // Enable Move button only when valid rows selected
      sN = a[i].id.slice(2);  // extract # from r_#
      if (!D.getElementById('n_' + sN).value
        && !D.getElementById('v_' + sN).value
        && !D.getElementById('s_' + sN).value) sSI += '[!]';
    }
  }
  oBRM.disabled = (sSI.indexOf('[!]')>-1 || !sSI);
  oBRU.disabled = (sSI.indexOf('[1]')>-1 || !sSI);
  oBRD.disabled = (sSI.indexOf('[' + oRLB.itemCount + ']')>-1 || !sSI);
}

// Import settings from CSV file
function importCSV() {
  var sImportError = oSB.getString('importError'),
    sImportOK = oSB.getString('importOK'),
    sImportDialog = oSB.getString('importDialog');
  FP.init(window, sImportDialog, F.modeOpen);
  if (FP.show()==F.returnOK) {
    var fstream = Cc['@mozilla.org/network/file-input-stream;1'].createInstance(Ci.nsIFileInputStream),
      cstream = Cc['@mozilla.org/intl/converter-input-stream;1'].createInstance(Ci.nsIConverterInputStream),
      oStr = {},
      nRead = 0,
      sData = '',
      aRows,
      aCols,
      sSplit,
      bAppend = D.getElementById('radio-append').selected,
      bExist,
      oCatId = {},
      i = 1,
      imax,
      n;
    // Turn off notifications
    oNB.removeAllNotifications();
    // Begin reading from file stream...
    fstream.init(FP.file, -1, 0, 0);
    cstream.init(fstream, 'UTF-8', 0, 0);
    do {
      // Read as much as we can and put it in oStr.value
      nRead = cstream.readString(0xffffffff, oStr);
      sData += oStr.value;
    } while (nRead!=0);
    // Close file stream
    cstream.close();
    // Prepare to store in aRows array
    sData = sData.replace(/^\s+|[ \r\n]+$/g, '');
    sData = sData.replace(/@@/g, '\\@\\@');
    sData = sData.replace(/~~/g, '\\~\\~');
    sData = sData.replace(/%%/g, '\\%\\%');
    sData = sData.replace(/\r?\n/g, '@@');
    // Comma-separated values
    if (/^### PROFILES ###,,,,/i.test(sData)) {
      sData = sData.replace(/,(?=[^"]*"(?:[^"]*"[^"]*")*[^"]*$)/g, '~~');
      sData = sData.replace(/@@([^"]+?,)/g, '\n$1');
      sSplit = ',';
    // Tab-separated values
    } else if (/^### PROFILES ###\t\t\t\t/i.test(sData)) {
      sData = sData.replace(/\t(?=[^"]*"(?:[^"]*"[^"]*")*[^"]*$)/g, '%%');
      sData = sData.replace(/(\t|@@)("[^"(@@)]*")(\t|@@)/g, '$1"$2"$3');
      sData = sData.replace(/@@([^"]+?\t)/g, '\n$1');
      sSplit = '\t';
    }
    aRows = sData.split('\n');
    imax = aRows.length;
    // Validate CSV format
    if (imax==0 || aRows[0].split(sSplit).length<5) {
      oNB.appendNotification(sImportError, '', '', oNB.PRIORITY_WARNING_LOW);
      return;
    }
    if (!bAppend) {
      // Clear rules table
      oR = {};
      nR = 1;
      // Clear profile list
      aC = [];
      nC = 1;
    }
    // Default to "All" profile so user can review all rules
    nCI = 0;
    n = setInterval(function() {
      aCols = aRows[i].split(sSplit);
      // Preprocess rules data
      for (var j=0, jmax=aCols.length; j<jmax; j++) {
        aCols[j] = aCols[j].replace(/^"|"$/g, '');
        aCols[j] = aCols[j].replace(/""/g, '"');
        aCols[j] = aCols[j].replace(/%%/g, '\t');
        aCols[j] = aCols[j].replace(/~~/g, ',');
        aCols[j] = aCols[j].replace(/@@/g, '\n');
        aCols[j] = aCols[j].replace(/\\%\\%/g, '%%');
        aCols[j] = aCols[j].replace(/\\~\\~/g, '~~');
        aCols[j] = aCols[j].replace(/\\@\\@/g, '@@');
      }
      // Import profiles
      if (!isNaN(parseInt(aCols[0].slice(1)))) {  // extract # from c#
        bExist = false;
        // Don't append if category already exists
        if (bAppend) {
          for (var j=0, jmax=aC.length; j<jmax; j++) {
            if (aC[j].n.toLowerCase()==aCols[1].toLowerCase()) {
              oCatId[aCols[0]] = aC[j].k;
              bExist = true;
              break;
            }
          }
        }
        if (!bExist) {
          aC[aC.length] = {
            k: (!bAppend) ? aCols[0] : 'c' + nC++,
            n: aCols[1],
            s: aCols[2],
            o: +aCols[3]
          };
          oCatId[aCols[0]] = aC[aC.length-1].k;
        }
        if (!bAppend) nC = Math.max(nC, aCols[0].slice(1))+1;  // extract # from c#
      // Import rules
      } else if (!isNaN(parseInt(aCols[0]))) {
        oR['r' + nR++] = {
          t: +aCols[0],
          n: aCols[1],
          v: aCols[2],
          s: aCols[3],
          c: (!bAppend) ? aCols[4] : oCatId[aCols[4]]
        };
      // Import exceptions
      } else if (aCols[0].toLowerCase().indexOf('exceptions')==0) {
        oTB.value = JSON.parse(aCols[1]).join('\n');
        saveOptions('exceptions');
      // Import options
      } else {
        for (var j in oOO) {
          if (aCols[0].toLowerCase().indexOf(j)==0) oOO[j].checked = +aCols[1];
        }
        if (aCols[0].toLowerCase().indexOf('delay')==0) {
          if (aCols[1]=='0') oD.value = '0';
          else oD.value = aCols[2]*10;
          oDO.textContent = oD.value/10 + ' sec';
        }
        saveOptions('other');
      }
      ++i;
      if (i==imax) {
        clearInterval(n);
        // Change to "All" profile
        changeCat(0);
        // Populate profiles (categories)
        popCats();
        oNB.appendNotification(sImportOK, '', '', oNB.PRIORITY_INFO_LOW);
        oBRS.disabled = false;
        // Set change flags
        bRC = true;
        bCC = true;
      }
    }, 10);
  }
}

// Restore options from prefs.js
function loadOptions() {
  oR = (P.prefHasUserValue(sR)) ? JSON.parse(P.getComplexValue(sR, SS).data) : {};
  nR = P.getIntPref(sRC);
  aC = (P.prefHasUserValue(sC)) ? JSON.parse(P.getComplexValue(sC, SS).data) : [];
  nC = P.getIntPref(sCC);
  nCI = P.getIntPref(sCI);
  oAO = D.getElementById('autofill-options');
  oAPF = D.getElementById('autofill-panel-fields');
  oSB = D.getElementById('string-bundle');
  D.getElementById('whatsnew').innerHTML = oSB.getString('whatsNew') + ' ' + nVer;
  // Show "What's New" if newer version
  if (nVer>P.getCharPref(sV)) {
    oAO.showPane(D.getElementById(sAP + 'support'));
    P.setCharPref(sV, nVer)
  // Switch to Form Fields if called from wizard
  } else if (window.arguments) {
    oAO.showPane(D.getElementById(sAP + 'fields'));
  }
  oRLB = D.getElementById('content-fields');
  oC2 = D.getElementById('col2');
  oC3 = D.getElementById('col3');
  oC4 = D.getElementById('col4');
  oC = D.getElementById('content-cats');
  oCS = D.getElementById('content-cat-site');
  oCO = D.getElementById('content-cat-overwrite');
  oBCR = D.getElementById('button-rename');
  oBCD = D.getElementById('button-delete');
  oBRR = D.getElementById('button-remove');
  oBRU = D.getElementById('button-up');
  oBRD = D.getElementById('button-down');
  oBRM = D.getElementById('button-move');
  oBRS = D.getElementById('button-save');
  oCCT = D.getElementById('content-ctrl-top');
  oCCB = D.getElementById('content-ctrl-bottom');
  oOO = {
    delay: D.getElementById('content-delay'),
    overwrite: D.getElementById('content-overwrite'),
    vars: D.getElementById('content-vars'),
    sound: D.getElementById('content-sound'),
    mask: D.getElementById('content-mask'),
    menu: D.getElementById('content-menu'),
    confirm: D.getElementById('content-confirm')
  };
  oD = D.getElementById('content-delay-sec');
  oDO = D.getElementById('content-delay-out');
  // Convert old oF to new oR with shorter property names
  migrateData();
  // Populate profiles (categories)
  popCats();
  // Switch to current profile
  // Default to Unfiled if nCI out of range
  if (nCI>oC.itemCount-1) nCI = 1;
  changeCat(nCI);
  // Load exceptions
  oTB = D.getElementById('content-exceptions');
  oTB.value = P.getComplexValue(sE, SS).data;
  // Load delay settings
  oD.value = P.getCharPref(sX + 'delaysec')*10;
  oDO.textContent = oD.value/10 + ' sec';
  // Initiate these last
  oNB = D.getElementById('status');
  F = Ci.nsIFilePicker;
  FP = Cc['@mozilla.org/filepicker;1'].createInstance(F);
  FP.appendFilter('CSV Files', '*.csv');
  FP.appendFilters(F.filterAll);
  W = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator).getMostRecentWindow('navigator:browser');
  // Enable/Disable buttons as needed
  oRLB.addEventListener('select', handleSelect, false);
  window.addEventListener('keydown', doKeyDown, false);
  window.addEventListener('resize', alignHeaders, false);
}

// Migrate data structures starting with v2.5
function migrateData() {
  var sF = sX + 'fields',
    str = Cc['@mozilla.org/supports-string;1'].createInstance(SS);
  if (P.prefHasUserValue(sF)) {
    var oF = JSON.parse(P.getComplexValue(sF, SS).data);
    for (var i in oF) {
      oR['r' + nR++] = {
        t: oF[i].type,
        n: oF[i].name,
        v: oF[i].value,
        s: oF[i].site,
        c: ''
      }
    }
    str.data = JSON.stringify(oR);
    P.setComplexValue(sR, SS, str);
    P.setIntPref(sRC, nR);
    P.deleteBranch(sF);
  }
}

// Move autofill rule to another profile
function moveRule() {
  var oParam = {
    i: {
      cats: aC
    },
    o: null
  };
  window.openDialog('chrome://autofill/content/moverule.xul', '', 'centerscreen, chrome, dialog, modal', oParam);
  if (oParam.o && oRLB.selectedCount>0) {
    for (var i=oRLB.itemCount, a=oRLB.childNodes, sBoxTooltip=oSB.getString('boxTooltip'), sN, oRow; i>0; i--) {
      if (a[i].selected) {
        sN = a[i].id.slice(2);  // extract # from r_#
        oRow = oR['r' + sN];
        // Move selected item to target profile if it exists
        if (oRow) oRow.c = oParam.o.cat;
        // Else save newly created item before moving
        else {
          oRow = {
            t: D.getElementById('t_'+ sN).selectedIndex,
            n: D.getElementById('n_'+ sN).value,
            v: D.getElementById('v_'+ sN).value,
            s: D.getElementById('s_'+ sN).value,
            c: oParam.o.cat
          };
        }
        // Only update tooltip and 'cat' if in "All" profile; else remove selected item
        if (sCN=='all') {
          var oElm = a[i].firstChild;
          while (oElm) {
            if (oElm.nodeType==1) {
              oElm.setAttribute('tooltiptext', 'Profile: ' + oParam.o.catlabel + '\n');
              if (oElm.nodeName=='textbox') oElm.tooltipText += sBoxTooltip;
            }
            oElm = oElm.nextSibling;
          }
          // If 'cat' property is not updated, categorization won't be saved if in "All" profile
          a[i].cat = oParam.o.cat;
        } else oRLB.removeItemAt(i-1);
      }
    }
    // Don't do these if in "All" profile
    if (sCN!='all') {
      alignHeaders();
      oBRR.disabled = true;
      oBRU.disabled = true;
      oBRD.disabled = true;
      oBRM.disabled = true;
    }
    oBRS.disabled = false;
    bCC = true;
    // Refresh item counts
    popCats();
  }
}

// Create new profile
function newCat() {
  var oParam = {
    i: {
      cats: aC,
      catReserved: oSB.getString('catReserved'),
      catExists: oSB.getString('catExists')
    },
    o: null
  };
  window.openDialog('chrome://autofill/content/catnew.xul', '', 'centerscreen, chrome, dialog, modal', oParam);
  if (oParam.o && oParam.o.value) {
    aC[aC.length] = {
      k: 'c' + nC++,
      n: oParam.o.value,
      s: '',
      o: +oOO['overwrite'].checked
    };
    aC.sort(sortByName);
    popCats(sCN);
    saveOptions('cats');
  }
}

// Confirm window close on unsaved changes
function onCancel() {
  // Save profile site filter and overwrite option
  saveOptions('cats');
  if (bRC || bCC) {
    var oParam = {
      i: {
        desc: (bRC && !bCC) ? 'changedRules' : (!bRC && bCC) ? 'changedCats' : 'changedBoth',
        type: 'confirmClose'
      },
      o: null
    };
    window.openDialog('chrome://autofill/content/confirm.xul', '', 'centerscreen, chrome, dialog, modal', oParam);
    if (oParam.o) return true;
    else return false;
  }
}

// Build profile list
function popCats(sCat) {
  var nCatCount = 0,
    nTotalCount = Object.size(oR),
    sAll = oC.getItemAtIndex(0).label,
    sUnfiled = oC.getItemAtIndex(1).label;
  for (var i=2, imax=Math.max(oC.itemCount-2, aC.length), j=0, o, n; i-2<imax; i++, j++) {
    o = oC.getItemAtIndex(i);
    if (aC[j]) {
      if (o) {
        o.label = aC[j].n;
        o.value = aC[j].k;
      } else o = oC.insertItemAt(i, aC[j].n, aC[j].k);
      n = 0;
      for (var k in oR) {
        if (aC[j].k==oR[k].c) n++;
      }
      nCatCount += n;
      if (n>0) o.label += ' (' + n + ')';
      if (aC[j].k==sCat) oC.selectedIndex = (nCI=i);
    } else if (o) oC.removeItemAt(i);
  }
  // Add item count for "All" and "Unfiled" profiles
  if (nTotalCount>0) {
    oC.getItemAtIndex(0).label = sAll.replace(/^([^(]+)\b.*$/, '$1 (' + nTotalCount + ')');
    oC.getItemAtIndex(1).label = sUnfiled.replace(/^([^(]+)\b.*$/, ((nTotalCount>nCatCount) ? '$1 (' + (nTotalCount-nCatCount) + ')' : '$1'));
  }
}

// Open document in a new tab
function openWin(sURL) {
  W.gBrowser.selectedTab = W.gBrowser.addTab(sURL);
}

// Refresh panel if profiles/rules have been modified by wizard
function refresh() {
  if (JSON.stringify(aC).length!=P.getComplexValue(sC, SS).data.length
    || JSON.stringify(oR).length!=P.getComplexValue(sR, SS).data.length) loadOptions();
}

// Remove all rules
function removeAllRows() {
  if (oRLB.itemCount>0) {
    // Unselect everything first to disable buttons
    oRLB.clearSelection();
    // Remove all items
    while (oRLB.itemCount) {
      oRLB.removeItemAt(0);
    }
  }
}

// Remove selected rule(s)
function removeRow() {
  if (oRLB.selectedCount>0) {
    // Remove selected items (exclude header row)
    for (var i=oRLB.itemCount, a=oRLB.childNodes; i>0; i--) {
      if (a[i].selected) {
        // Rules have changed if saved item deleted
        if (oR['r' + a[i].id.slice(2)]) bRC = true;  // extract # from r_#
        oRLB.removeItemAt(i-1);
      }
    }
    alignHeaders();
    oBRR.disabled = true;
    oBRU.disabled = true;
    oBRD.disabled = true;
    oBRS.disabled = false;
  }
}

// Rename profile
function renameCat() {
  var oParam = {
    i: {
      text: oC.getItemAtIndex(nCI).label.replace(/ \(\d+\)/, ''),
      cats: aC,
      catnow: nCI,
      catReserved: oSB.getString('catReserved'),
      catExists: oSB.getString('catExists')
    },
    o: null
  };
  window.openDialog('chrome://autofill/content/catrename.xul', '', 'centerscreen, chrome, dialog, modal', oParam);
  if (oParam.o) {
    aC = oParam.o.cats;
    aC.sort(sortByName);
    popCats(sCN);
    saveOptions('cats');
  }
}

// Reorder rule down
function rowDown() {
  if (oRLB.selectedCount>0) {
    for (var i=oRLB.itemCount, a=oRLB.childNodes, oElm, oData; i>0; i--) {
      if (a[i].selected) {
        if (i+1==oRLB.itemCount) oBRD.disabled = true;
        else if (i<oRLB.itemCount) oBRU.disabled = false;
        else return;
        // Rules have changed if saved item moved
        if (oR['r' + a[i].id.slice(2)]) bRC = true;  // extract # from r_#
        // Retain data or it will be lost after reordering
        oData = {};
        oElm = a[i].firstChild;
        while (oElm) {
          if (oElm.nodeName=='textbox') {
            oData[oElm.id] = oElm.value;
          }
          oElm = oElm.nextSibling;
        }
        oRLB.insertBefore(a[i], a[i+1].nextSibling);
        // Restore data after reordering
        for (var j in oData) {
          D.getElementById(j).value = oData[j];
        }
        oRLB.ensureElementIsVisible(a[i+1]);
      }
    }
    oBRS.disabled = false;
  }
}

// Reorder rule up
function rowUp() {
  if (oRLB.selectedCount>0) {
    for (var i=1, imax=oRLB.itemCount+1, a=oRLB.childNodes, oElm, oData; i<imax; i++) {
      if (a[i].selected) {
        if (i-1==1) oBRU.disabled = true;
        if (i>1) oBRD.disabled = false;
        else return;
        // Rules have changed if saved item moved
        if (oR['r' + a[i].id.slice(2)]) bRC = true;  // extract # from r_#
        // Retain data or it will be lost after reordering
        oData = {};
        oElm = a[i].firstChild;
        while (oElm) {
          if (oElm.nodeName=='textbox') {
            oData[oElm.id] = oElm.value;
          }
          oElm = oElm.nextSibling;
        }
        oRLB.insertBefore(a[i], a[i-1]);
        // Restore data after reordering
        for (var j in oData) {
          D.getElementById(j).value = oData[j];
        }
        oRLB.ensureElementIsVisible(a[i-1]);
      }
    }
    oBRS.disabled = false;
  }
}

// Save options to prefs.js
function saveOptions(sPref, nFlag) {
  var aRLI = D.getElementsByTagName('richlistitem'),
    oName,
    oSite,
    sN,
    sName,
    sValue,
    sSite,
    str = Cc['@mozilla.org/supports-string;1'].createInstance(SS);
  // Save changes to profile list and current profile index
  if (sPref=='cats' || !sPref) {
    // Save profile site filter and overwrite option
    if (nCI>1) {
      aC[nCI-2].s = oCS.value.replace(/^\s+|\s+$/g, '');
      aC[nCI-2].o = +oCO.checked;
    }
    str.data = JSON.stringify(aC);
    P.setComplexValue(sC, SS, str);
    P.setIntPref(sCC, nC);
    P.setIntPref(sCI, nCI);
  }
  // Save autofill rules
  if (sPref=='rules' || !sPref) {
    // Clear rules in current profile
    for (var i in oR) {
      if (sCN=='all' || sCN==oR[i].c) delete oR[i];
    }
    // Save table data to oR object
    for (var i=0, imax=aRLI.length; i<imax; i++) {
      sN = aRLI[i].id.slice(2);  // extract # from r_#
      oName = D.getElementById('n_' + sN);
      oSite = D.getElementById('s_' + sN);
      // Normalize data
      sName = (oName.value=oName.value.replace(/^\s+|\s+$/g, '').replace(/\s*[\r\n]+\s*/g, '\n'));
      sValue = D.getElementById('v_' + sN).value;
      sSite = (oSite.value=cleanText(oSite.value));
      if (!sName && !sValue && !sSite) continue;  // ignore blank rows
      oR['r' + sN] = {
        t: D.getElementById('t_' + sN).selectedIndex,
        n: sName,
        v: sValue,
        s: sSite,
        c: D.getElementById('r_' + sN).cat
      };
    }
    // Delete empty rows
    for (var i=aRLI.length-1; i>-1; i--) {
      sN = aRLI[i].id.slice(2);  // extract # from r_#
      if (!D.getElementById('n_' + sN).value
        && !D.getElementById('v_' + sN).value
        && !D.getElementById('s_' + sN).value) oRLB.removeItemAt(i);
    }
    alignHeaders();
    oBRS.disabled = true;
    // Refresh item counts
    popCats();
    str.data = JSON.stringify(oR);
    P.setComplexValue(sR, SS, str);
    P.setIntPref(sRC, nR);
    // Also save profiles in case of importing
    saveOptions('cats');
    // Reset change flags
    bRC = false;
    bCC = false;
  }
  // Save exceptions
  if (sPref=='exceptions' || !sPref) {
    oTB.value = cleanText(oTB.value);
    str.data = oTB.value;
    if (P.getComplexValue(sE, SS).data!=oTB.value) P.setComplexValue(sE, SS, str);
  }
  // Save other settings
  if (sPref=='other' || !sPref) {
    for (var i in oOO) {
      if (P.getBoolPref(sX + i)!=oOO[i].checked) P.setBoolPref(sX + i, oOO[i].checked);
    }
  }
  // Toggle autofill delay
  // nFlag : 0 = checkbox, 1 = scale
  if (sPref=='delay') {
    var n;
    switch (nFlag) {
      case 0:
        oD.value = +oOO[sPref].checked*10;
        n = oD.value/10;
        oDO.textContent = n + ' sec';
        P.setCharPref(sX + sPref + 'sec', n);
        break;
      case 1:
        n = oD.value/10;
        oOO[sPref].checked = (n>0);
        oDO.textContent = n + ' sec';
        P.setBoolPref(sX + sPref, oOO[sPref].checked);
        return n;
    }
  }
  // Toggle password masking
  if (sPref=='mask') {
    var nLR = oRLB.lastChild.id.slice(2);  // extract # from r_#
    if (D.getElementById('n_' + nLR).value || D.getElementById('v_' + nLR).value) saveOptions('rules');
    buildRules(oC.value);
  }
}

// Show Edit Box
function showEditBox(oCell, e) {
  if (e) {
    switch (e.type) {
      case 'click':  /* require a triple-click */
        if (e.detail<3) return;
        break;
      case 'keydown':  /* or Alt|Ctrl+Enter */
        if (!(((!bMac)?e.altKey:e.ctrlKey) && e.keyCode==13)) return;
        break;
    }
  }
  var oParam = {
    i: {
      id: oCell.id,
      value: oCell.value.replace(/(\*\/)\s*/, '$1\n')
    },
    o: null
  };
  // Preprocess Value to Autofill column
  if (oCell.id.indexOf('v_')>-1) {
    // Replace \n with newlines
    while (/([^\\])\\n/.test(oParam.i.value)) {
      oParam.i.value = oParam.i.value.replace(/([^\\])\\n/g, '$1\n');
    }
    // Replace \\n with literal \n
    oParam.i.value = oParam.i.value.replace(/\\\\n/g, '\\n');
  }
  // Replace pipes with newlines in Site Filter
  if (oCell.id.indexOf('s_')>-1) oParam.i.value = oParam.i.value.replace(/\|/g, '\n');
  window.openDialog('chrome://autofill/content/editbox.xul', '', 'centerscreen, chrome, dialog=no, modal, resizable', oParam);
  if (oParam.o) {
    oCell.value = oParam.o.value;
    if (oR['r' + oCell.id.slice(2)][oCell.id.slice(0, 1)]!=oCell.value) oBRS.disabled = false;  // extract # from x_# and x from x_#
  }
}

// Sort names alphabetically
function sortByName(a, b) {
  var s1 = a.n.toLowerCase(),
    s2 = b.n.toLowerCase();
  return ((s1<s2) ? -1 : ((s1>s2) ? 1 : 0));
}

// Validate Form Fields row data
function validRow(o) {
  var sN = o.id.slice(2),  /* extract # from x_# */
    oRow = oR['r' + sN];
  switch (o.nodeName) {
    case 'menulist':
      // Change Value column to password input box if Type = Password
      if (oOO['mask'].checked) {
        D.getElementById('v_' + sN).setAttribute('type', (o.selectedIndex==1) ? 'password' : null);
      }
      // Add read-only state and set value to "*click*" if changing to Type = Button
      if (o.selectedIndex==5) {
        D.getElementById('v_' + sN).value = '*click*';
        D.getElementById('v_' + sN).setAttribute('disabled', 'disabled');
      // Remove read-only state and empty Value if changing from Type = Button
      } else {
        D.getElementById('v_' + sN).value = oRow.v;
        D.getElementById('v_' + sN).removeAttribute('disabled');
      }
      // Put focus on Name column if newly added rule
      if (!oRow) D.getElementById('n_' + sN).focus();
      // Enable Save button only if new item selected
      if (oRow && o.selectedIndex!=oRow.t) oBRS.disabled = false;
      break;
    case 'textbox':
      // Enable Move and Save buttons only if data has changed
      if ((oRow && o.value!=oRow[o.id.slice(0, 1)]) || (o.value && !oRow)) {  // extract x from x_#
        oBRM.disabled = false;
        oBRS.disabled = false;
        bRC = true;
      } else if (!D.getElementById('n_' + sN).value
        && !D.getElementById('v_' + sN).value
        && !D.getElementById('s_' + sN).value) oBRM.disabled = true;
      break;
  }
}

window.addEventListener('load', loadOptions, false);