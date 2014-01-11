/*
 * @package Autofill
 * @author Tom Doan
 * @copyright (c) Tom Doan
 * @license GNU General Public License
 * @link http://www.tohodo.com/
 */

var D = document,
  L = opener.content.location,
  Cc = Components.classes,
  Ci = Components.interfaces,
  P = Cc['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefBranch),
  SS = Ci.nsISupportsString,
  sX = 'extensions.autofill.',
  sR = sX + 'rules',
  sRC = sX + 'rulecount',
  sC = sX + 'cats',
  sCC = sX + 'catcount',
  sCI = sX + 'catnow',
  oSB,  /* string bundle */
  oNB,  /* notification box */
  oC,   /* profiles menu */
  oCN,  /* new profile name */
  oCB,  /* checkbox option */
  oI = window.arguments[0].i,
  bF = oI.isField;

// Initiate step 1
function init1() {
  oSB = D.getElementById('string-bundle');
  D.getElementById('content-desc').textContent = (!bF) ? oSB.getString('wizDescForm') : oSB.getString('wizDescField');
  // Highlight selected field
  selField(1);
}

// Initiate step 2
function init2() {
  var aC = (P.prefHasUserValue(sC)) ? JSON.parse(P.getComplexValue(sC, SS).data) : [],
    nCI = P.getIntPref(sCI),
    aSel = [{k:'', n:'Unfiled'}],
    nSelIndex = (nCI>1) ? nCI-1 : 0;
  oNB = D.getElementById('status');
  oC = D.getElementById('content-cats');
  oCN = D.getElementById('content-catnew');
  oCB = D.getElementById('content-wizopen');
  // Populate profiles (categories)
  aSel = aSel.concat(aC);
  aSel[aSel.length] = {k:'new', n:'New...'};
  if (oC.itemCount>0) oC.removeAllItems();
  for (var i=0, imax=aSel.length; i<imax; i++) {
    oC.appendItem(aSel[i].n, aSel[i].k);
    if (i==nSelIndex) oC.selectedIndex = i;
  }
  oC.getItemAtIndex(oC.itemCount-1).style.fontWeight = 'bold';
  oCB.checked = P.getBoolPref(sX + 'wizopen');
}

// Change profile
function changeCat() {
  oCN.hidden = (oC.value!='new');
  if (!oCN.hidden) oCN.focus();
}

// Generate autofill rules
function createRules(oField, sCat, sCatSite, sDomain) {
  var doc = opener.content.document,
    oR = (P.prefHasUserValue(sR)) ? JSON.parse(P.getComplexValue(sR, SS).data) : {},
    nR = P.getIntPref(sRC),
    aRules = [],
    aI = [],
    aT = [],
    aS = [],
    aIF = [],
    aD = [],
    aRadio = [], oRadio,
    o, sName, sValue,
    sTag = oField.nodeName;
  // Set up element collections
  if (oField) {
    switch (sTag) {
      case 'INPUT':
        if (oField.type!='radio') aI = [oField];
        else {
          var a = doc.querySelectorAll('input[type="radio"]');
          for (var i=0, imax=a.length; i<imax; i++) {
            if (a[i].name==oField.name) aI[aI.length] = a[i];
          }
        }
        break;
      case 'TEXTAREA':
        aT = [oField];
        break;
      case 'SELECT':
        aS = [oField];
        break;
      case 'OPTION':
        aS = [oField.parentNode];
        break;
      default:
        // iframes
        if (oField.ownerDocument.URL.indexOf('data:')==0
          || oField.ownerDocument.body.childElementCount<2
          || /iframe|rte|wym/i.test(oField.ownerDocument.body.className)) {
          sValue = '';
          while (oField) {
            if (oField.nodeName=='BODY') {
              sValue = oField.textContent;
              break;
            }
            oField = oField.parentNode;
          }
          aIF = doc.getElementsByTagName('iframe');
          for (var i=0, imax=aIF.length; i<imax; i++) {
            if (aIF[i].contentDocument.body.textContent==sValue) {
              aIF = [aIF[i]];
              break;
            }
          }
        // contentEditable divs
        } else if (oField.type==undefined) {
          while (oField) {
            if (oField.contentEditable=='true') break;
            oField = oField.parentNode;
          }
          aD = doc.querySelectorAll('div[contentEditable="true"]');
          for (var i=0, imax=aD.length; i<imax; i++) {
            if (aD[i]==oField) {
              aD = [aD[i]];
              break;
            }
          }
        }
    }
  } else {
    aI = doc.getElementsByTagName('input');
    aT = doc.getElementsByTagName('textarea');
    aS = doc.getElementsByTagName('select');
    aIF = doc.getElementsByTagName('iframe');
    aD = doc.querySelectorAll('div[contentEditable="true"]');
  }
  // Define the rules
  for (var i=0, imax=aI.length; i<imax; i++) {
    o = aI[i];
    sName = o.name || o.id || ((o.type=='button' || o.type=='submit') ? o.value : o.className);
    // Create rules for inputs
    switch (o.type) {
      case 'text':
        if (sName && o.value) {
          aRules[aRules.length] = {
            t: 0,
            n: sName,
            v: o.value
          }
        }
        break;
      case 'email':
        if (sName && o.value) {
          aRules[aRules.length] = {
            t: 0,
            n: sName,
            v: o.value
          }
        }
        break;
      case 'password':
        if (o.value) {
          aRules[aRules.length] = {
            t: 1,
            n: sName,
            v: o.value
          }
        }
        break;
      case 'checkbox':
        if (sName) {
          aRules[aRules.length] = {
            t: 3,
            n: sName,
            v: String(+o.checked)
          }
        }
        break;
      case 'radio':  /* collect radio groups first */
        if (sName) {
          oRadio = aRadio[aRadio.length-1];
          if (oRadio && oRadio.n==sName) {
            oRadio.v += String(+o.checked);
          } else {
            aRadio[aRadio.length] = {
              n: sName,
              v: String(+o.checked)
            }
          }
        }
        break;
      case 'button':
        if (sName) {
          aRules[aRules.length] = {
            t: 5,
            n: sName
          }
        }
        break;
      case 'submit':
        if (sName) {
          aRules[aRules.length] = {
            t: 5,
            n: sName
          }
        }
        break;
    }
  }
  // Create rules for radio groups
  for (var i=0, imax=aRadio.length; i<imax; i++) {
    if (aRadio[i].v.indexOf('1')>-1) {
      aRules[aRules.length] = {
        t: 3,
        n: aRadio[i].n,
        v: aRadio[i].v
      }
    }
  }
  // Create rules for textareas
  for (var i=0, imax=aT.length; i<imax; i++) {
    o = aT[i];
    // Skip hidden textareas
    if (o.style.display=='none' || o.style.visibility=='hidden') continue;
    sName = o.name || o.id || o.className;
    sValue = o.value;
    // Escape literal \n
    sValue = sValue.replace(/\\n/g, '\\\n');
    // Replace newlines with \n
    sValue = sValue.replace(/\n/g, '\\n');
    if (sName && sValue) {
      aRules[aRules.length] = {
        t: 0,
        n: sName,
        v: sValue
      }
    }
  }
  // Create rules for selects
  for (var i=0, imax=aS.length; i<imax; i++) {
    o = aS[i];
    sName = o.name || o.id || o.className;
    if (sName) {
      if (o.multiple) {
        sValue = '';
        for (var j=0, jmax=o.length, k=0; j<jmax; j++) {
          if (o[j].selected) {
            sValue += ' ' + j;
            k++;
          }
          if (j+1==jmax && k==jmax) sValue = '1!';
        }
        sValue = sValue.slice(1);
      } else sValue = String(o.selectedIndex);
      aRules[aRules.length] = {
        t: 2,
        n: sName,
        v: sValue
      }
    }
  }
  // Create rules for iframes
  for (var i=0, imax=aIF.length, oDoc; i<imax; i++) {
    o = aIF[i];
    // Skip third-party iframes
    if (o.src && !/^(about|data|javascript)/i.test(o.src)
      && o.src.indexOf(L.protocol + '//' + L.hostname)!=0) continue;
    oDoc = o.contentDocument;
    sName = o.name || o.id || o.className || o.src;
    sValue = oDoc.body.innerHTML;
    // Skip iframes containing scripts
    if (/<script/i.test(sValue)) continue;
    sValue = sValue.replace(/\\n/g, '\\\\n');  // escape literal \n
    if (sName && oDoc.body.textContent.replace(/\s+/, '')) {
      aRules[aRules.length] = {
        t: 0,
        n: sName,
        v: sValue
      }
    }
  }
  // Create rules for contentEditable divs
  for (var i=0, imax=aD.length; i<imax; i++) {
    o = aD[i];
    sName = o.name || o.id || o.className;
    sValue = o.innerHTML.replace(/\\n/g, '\\\\n');  // escape literal \n
    if (sName && sValue) {
      aRules[aRules.length] = {
        t: 0,
        n: sName,
        v: sValue
      }
    }
  }
  // Save new rules
  if (aRules.length>0) {
    var str = Cc['@mozilla.org/supports-string;1'].createInstance(SS);
    // If new site, move profile site filter to rule level
    if (sCatSite) {
      for (var i in oR) {
        if (oR[i].c==sCat) oR[i].s = sCatSite;
      }
    }
    for (var i=0, imax=aRules.length; i<imax; i++) {
      oR['r' + nR++] = {
        t: aRules[i].t,  /* Type */
        n: '^' + aRules[i].n.replace(/([$^.?+*\\|(){}\[\]])/g, '\\$1').replace(/^ +| +$/g, ' *') + '$',  /* Name (escape reserved characters) */
        v: aRules[i].v,  /* Value */
        s: sDomain,      /* Site */
        c: sCat          /* Profile (category) */
      }
    }
    str.data = JSON.stringify(oR);
    P.setComplexValue(sR, SS, str);
    P.setIntPref(sRC, nR);
  }
  // Open Options after closing wizard?
  if (oCB.checked) {
    if (!oI.options || oI.options.closed) opener.Autofill.O = window.openDialog('chrome://autofill/content/options.xul', '', 'centerscreen, chrome, dialog=no, resizable, toolbar', {});
    else oI.options.focus();
  }
}

// 'Finish' button event handler
function handleFinish() {
  var aC = (P.prefHasUserValue(sC)) ? JSON.parse(P.getComplexValue(sC, SS).data) : [],
    nC = P.getIntPref(sCC),
    nCI = P.getIntPref(sCI),
    sCat, sCatSite,
    sDomain = L.hostname,
    bCatNew = (oC.value=='new'),
    str = Cc['@mozilla.org/supports-string;1'].createInstance(SS);
  // Add new profile
  if (bCatNew) {
    var sNew = oCN.value.replace(/^\s+|\s+$/g, '');
    if (!sNew) {
      return showError(oSB.getString('catEmpty'));
    }
    if (sNew.toLowerCase()=='all' || sNew.toLowerCase()=='unfiled') {
      return showError('"' + sNew + '" ' + oSB.getString('catReserved'));
    }
    for (var i=0, imax=aC.length; i<imax; i++) {
      if (sNew.toLowerCase()==aC[i].n.toLowerCase()) {
        return showError('"' + sNew + '" ' + oSB.getString('catExists'));
      }
    }
    // Add profile if no errors
    aC[aC.length] = {
      k: (sCat='c'+nC++),
      n: sNew,
      s: sDomain,
      o: +P.getBoolPref(sX + 'overwrite')
    };
    aC.sort(sortByName);
  } else sCat = oC.value;
  for (var i=0, imax=aC.length; i<imax; i++) {
    if (aC[i].k==sCat) {
      // Update current index
      nCI = i+2;
      // Don't set rule site filter if profile site filter exists
      if (aC[i].s) {
        if (aC[i].s==sDomain) sDomain = '';
        else {
          sCatSite = aC[i].s;
          aC[i].s = '';
        }
      }
      break;
    }
    // If profile doesn't exist, then default to Unfiled
    if (i+1==imax) {
      sCat = '';
      nCI = 1;
    }
  }
  str.data = JSON.stringify(aC);
  P.setComplexValue(sC, SS, str);
  P.setIntPref(sCC, nC);
  P.setIntPref(sCI, nCI);
  // Generate rules
  createRules(((bF)?oI.target:''), sCat, (sCatSite||''), ((bCatNew)?'':sDomain));
  // Remove highlight
  selField(0);
  return true;
}

// Toggle field highlight
function selField(bOn) {
  if (!bF) return;
  var oField = oI.target,
    sTag = oField.nodeName,
    sColor = '#cadbf2';
  switch (sTag) {
    case 'OPTION':
      oField.parentNode.style.backgroundColor = (bOn) ? '#cadbf2' : '';
      break;
    case 'HTML':
      oField.parentNode.body.style.backgroundColor = (bOn) ? '#cadbf2' : '';
      break;
    default:
      switch (oField.type) {
        case 'checkbox':
          oField.style.outline = (bOn) ? '3px solid ' + sColor : 'none';
          break;
        case 'radio':
          var a = opener.content.document.querySelectorAll('input[type="radio"]');
          for (var i=0, imax=a.length; i<imax; i++) {
            if (a[i].name==oField.name) a[i].style.outline = (bOn) ? '3px solid ' + sColor : 'none';
          }
          break;
        default:
          // iframes
          if (oField.ownerDocument.URL.indexOf('data:')==0
            || oField.ownerDocument.body.childElementCount<2
            || /iframe|rte|wym/i.test(oField.ownerDocument.body.className)) {
            while (oField) {
              if (oField.nodeName=='BODY') break;
              oField = oField.parentNode;
            }
          // contentEditable divs
          } else if (oField.type==undefined) {
            while (oField) {
              if (oField.contentEditable=='true') break;
              oField = oField.parentNode;
            }
          }
          oField.style.backgroundColor = (bOn) ? '#cadbf2' : '';
      }
  }
}

// Save checkbox option
function saveOption() {
  P.setBoolPref(sX + 'wizopen', oCB.checked);
}

// Show error notification
function showError(sMsg) {
  if (oNB.currentNotification) oNB.removeAllNotifications();
  oNB.appendNotification(sMsg, '', '', oNB.PRIORITY_WARNING_LOW);
  return false;
}

// Sort names alphabetically
function sortByName(a, b) {
  var s1 = a.n.toLowerCase(),
    s2 = b.n.toLowerCase();
  return ((s1<s2) ? -1 : ((s1>s2) ? 1 : 0));
}
