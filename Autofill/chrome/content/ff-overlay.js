/*
 * @package Autofill
 * @author Tom Doan
 * @copyright (c) Tom Doan
 * @license GNU General Public License
 * @link http://www.tohodo.com/
 */

if (typeof Autofill=='undefined') {
  var Autofill = {
    /* Preferences interface */
    P: Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch),
    /* Complex strings interface (for Unicode support) */
    SS: Components.interfaces.nsISupportsString,
    /* Options window */
    O: null,
    /* Wizard window */
    W: null,
    /* Is right-clicked element a field? */
    field: false,
    /* Delay 1 sec to allow dynamically built iframes to be detected */
    delay: function(e) {
      var n = +Autofill.P.getCharPref('extensions.autofill.delaysec');
      if (n>0) window.setTimeout(function(){Autofill.execute(e);}, n*1000);
      else Autofill.execute(e);
    },
    /* Initialize */
    init: function() {
      var oMenu = document.getElementById('contentAreaContextMenu');
      oMenu.addEventListener('popupshowing', this.drawMenu, false);
      gBrowser.addEventListener('DOMContentLoaded', this.delay, true);
    },
    /* Render main Autofill context menu */
    drawMenu: function() {
      var D = document,
        sTag = gContextMenu.target.nodeName,
        bHide = (gContextMenu.onImage || gContextMenu.onLink || !Autofill.P.getBoolPref('extensions.autofill.menu'));
      Autofill.field = (gContextMenu.onTextInput || sTag=='INPUT' || sTag=='SELECT' || sTag=='OPTION');
      D.getElementById('autofill-menu').hidden = bHide;
      D.getElementById('autofill-menusep').hidden = bHide;
      D.getElementById('autofill-menu-wizform').hidden = Autofill.field;
      D.getElementById('autofill-menu-wizfield').hidden = !Autofill.field;
    },
    /* Render Profiles context submenu */
    drawCatsMenu: function() {
      var sX = 'extensions.autofill.',
        oMenuCats = document.getElementById('autofill-menu-cats'),
        aCats = (this.P.prefHasUserValue(sX + 'cats')) ? JSON.parse(this.P.getComplexValue(sX + 'cats', this.SS).data) : [],
        nCatIndex = this.P.getIntPref(sX + 'catnow');
      for (var i=2, imax=Math.max(oMenuCats.itemCount-2, aCats.length), j=0, o; i-2<imax; i++, j++) {
        o = oMenuCats.getItemAtIndex(i);
        if (aCats[j]) {
          if (o) o.label = aCats[j].n;
          else {
            o = oMenuCats.insertItemAt(i, aCats[j].n);
            o.setAttribute('name', 'autofill-profile');
            o.setAttribute('type', 'radio');
          }
          o.setAttribute('oncommand', 'Autofill.execute(null,' + i + ')');
        } else if (o) oMenuCats.removeItemAt(i);
      }
      oMenuCats.getItemAtIndex(nCatIndex).setAttribute('checked', 'true');
    },
    /* Execute Autofill */
    execute: function(e, nCI) {
      // Document that triggered 'onload' event
      var doc = (e) ? e.originalTarget : window.content.document,
        url = (doc.location) ? doc.location.href : '';
      // Handle only true web documents
      if (!(doc instanceof HTMLDocument)
        || !url
        || url.indexOf('about:')==0
        || url.indexOf('chrome:')==0
        || url.indexOf('javascript:')==0) return;
      // BEGIN main logic
      var Cc = Components.classes,
        Ci = Components.interfaces,
        sX = 'extensions.autofill.',
        aI = doc.getElementsByTagName('input'),
        aT = doc.getElementsByTagName('textarea'),
        aS = doc.getElementsByTagName('select'),
        aIF = doc.getElementsByTagName('iframe'),
        aD = doc.querySelectorAll('div[contentEditable="true"]'),
        o, sCat, sType, sName, sValue, sInts, aInts,
        re, reLabel, reSpace = /\s|<\/?(br|p) ?\/?>|<.+?> *<.+?>/gi, n = 0,
        oRules = (this.P.prefHasUserValue(sX + 'rules')) ? JSON.parse(this.P.getComplexValue(sX + 'rules', this.SS).data) : {},
        aCats = (this.P.prefHasUserValue(sX + 'cats')) ? JSON.parse(this.P.getComplexValue(sX + 'cats', this.SS).data) : [],
        nCatIndex = this.P.getIntPref(sX + 'catnow'),
        aExceptions = (this.P.getCharPref(sX + 'exceptions')) ? this.P.getComplexValue(sX + 'exceptions', this.SS).data.split('\n') : [],
        oOther = {
          labelmatch: this.P.getBoolPref(sX + 'labelmatch'),
          vars: this.P.getBoolPref(sX + 'vars'),
          sound: this.P.getBoolPref(sX + 'sound')
        },
        bOverwrite = 0,
        sLb, reLb = /^\(\?<([!=])([^)]+)\)(.+)/, reLbEnd,
        sAlpha = 'abcdefghijklmnopqrstuvwxyz',
        sNum = '0123456789',
        sAlphaNum = sAlpha + sAlpha.toUpperCase() + sNum + sNum,
        T = function(o) {
          if (!sLb) {
            if (re.test(o.name) || re.test(o.id)) return true;
            else if ((sType=='button' || sType=='submit') && re.test(o.value)) return true;
            else if (!(o.name || o.id) && re.test(o.className)) return true;
            else if (o.src && re.test(o.src)) return true;  // for certain iframes, e.g. WYMeditor
            // Try to find match in text label
            else if (oOther['labelmatch']) return Autofill.findText(o, re);
          } else {
            /* Process Regular Expression 'lookbehind' syntax */
            var bLb = false,
              sHaystack = (o.name || o.id) ? o.name + ' ' + o.id : o.className,
              aMatch;
            while (aMatch = reLbEnd.x.reG(sHaystack)) {
              /* If the inner pattern matched, but the leading or trailing lookbehind failed */
              if (reLbEnd.x.re.test(sHaystack.slice(0, aMatch.index))!=reLbEnd.x.type) bLb = true;
            }
            return bLb;
          }
        };
      // Exit if rules table is empty
      for (var i in oRules) {
        if (oRules.hasOwnProperty(i)) n++;
      }
      if (n<1) return;
      else n = 0;
      // Exit if document title or URL matches a pattern in aExceptions
      for (var i=0, imax=aExceptions.length; i<imax; i++) {
        re = new RegExp(this.cleanRE(aExceptions[i]), 'i');
        if (re.test(doc.title) || re.test(doc.location.href)) return;
      }
      // Update current profile index when selecting from context menu
      if (nCI!=undefined) {
        nCatIndex = nCI;
        this.P.setIntPref(sX + 'catnow', nCI);
      }
      // Get current profile (category)
      sCat = (nCatIndex>1) ? aCats[nCatIndex-2].k : (nCatIndex==0) ? 'all' : '';
      // If profile is not All or Unfiled...
      if (sCat && sCat!='all') {
        // Define site Regular Expression pattern for profile
        re = new RegExp(aCats[nCatIndex-2].s || '.', 'i');
        // Only proceed if profile filter matches document title or URL
        if (!(re.test(doc.title) || re.test(doc.location.href))) return;
        // Get profile overwrite flag
        bOverwrite = aCats[nCatIndex-2].o || 0;
      // If profile is All...
      } else if (sCat=='all') {
        var oCats = {};
        for (var i=0, imax=aCats.length; i<imax; i++) {
          oCats[aCats[i].k] = {
            s: aCats[i].s || '',
            o: aCats[i].o || 0
          }
        }
      }
      // Fill out form
      for (var i in oRules) {
        // Only process autofill rules in current profile
        // (unless "always execute all rules" option is enabled)
        if (sCat!='all' && sCat!=oRules[i].c) continue;
        // If profile is All and not Unfiled...
        else if (sCat=='all' && oRules[i].c) {
          // Define site Regular Expression pattern for profile
          re = new RegExp(oCats[oRules[i].c].s || '.', 'i');
          // Only proceed if profile filter matches document title or URL
          if (!(re.test(doc.title) || re.test(doc.location.href))) continue;
          // Get profile overwrite flag
          bOverwrite = oCats[oRules[i].c].o || 0;
        }
        // Define site Regular Expression pattern for rule
        re = new RegExp(oRules[i].s || '.', 'i');
        // Only proceed if rule filter matches document title or URL
        if (!(re.test(doc.title) || re.test(doc.location.href))) continue;
        // Pre-process Regular Expressions
        sName = this.cleanRE(oRules[i].n);
        sValue = oRules[i].v;
        // Preprocess Value to Autofill
        // Replace \n with newlines
        while (/([^\\])\\n/.test(sValue)) {
          sValue = sValue.replace(/([^\\])\\n/g, '$1\n');
        }
        // Replace \\n with literal \n
        sValue = sValue.replace(/\\\\n/g, '\\n');
        // Set up Regular Expression 'lookbehind'
        if (reLb.test(sName)) {
          sLb = sName.replace(reLb, '$1');
          reLbEnd = new RegExp(sName.replace(reLb, '$3'), 'gi');
          reLbEnd.x = {
            reG: reLbEnd,
            re: new RegExp(sName.replace(reLb, '($2)') + '$', 'i'),
            type: (sLb=='!') ? true : false
          };
          // Reset sName to prevent invalid Regular Expression error
          sName = ' ';
        } else sLb = '';
        // Define field name/id Regular Expression pattern
        re = new RegExp(sName, 'i');
        // Translate {...} variables
        if (oOther['vars']) {
          var aMatches,
            reVar,
            R = this.rand;
          // Text spinner
          if ((reVar=/{[^|}]+(\|[^|}]*)+}/g).test(sValue)) {
            var aWords;
            aMatches = sValue.match(reVar);
            for (var j=0, jmax=aMatches.length; j<jmax; j++) {
              reVar = new RegExp(aMatches[j].replace(/\|/g, '\\|'));
              aWords = aMatches[j].substring(1, aMatches[j].length-1).split('|');
              sValue = sValue.replace(reVar, aWords[R(0, aWords.length-1)]);
            }
          }
          if ((reVar=/{[#$]\d*}/g).test(sValue)) {
            var nCount, sOut;
            aMatches = sValue.match(reVar);
            for (var j=0, jmax=aMatches.length; j<jmax; j++) {
              reVar = new RegExp(aMatches[j].replace(/\$/g, '\\$'));
              nCount = +aMatches[j].replace(/\D/g, '') || 1;
              // Random number
              if (aMatches[j].indexOf('#')>0) {
                sOut = R(1, 9);
                for (var k=1; k<nCount; k++) {
                  sOut += String(R(0, 9));
                }
              // Random string
              } else {
                sOut = sAlphaNum.charAt(R(0, 51));
                for (var k=1; k<nCount; k++) {
                  sOut += sAlphaNum.charAt(R(0, sAlphaNum.length-1));
                }
              }
              sValue = sValue.replace(reVar, sOut);
            }
          }
        }
        // If field type not equal to 'select'
        if (oRules[i].t!=2) {
          // Inputs
          for (var j=0, jmax=aI.length; j<jmax; j++) {
            o = aI[j];
            sType = o.type;
            // Filter out irrelevant elements
            switch (oRules[i].t) {
              case 0:  /* Text */
                if (sType!='text' && sType!='email') continue;
                break;
              case 1:  /* Password */
                if (sType!='password') continue;
                break;
              case 3:  /* Checkbox/Radio */
                if (sType!='checkbox' && sType!='radio') continue;
                break;
              case 4:  /* Hidden */
                if (sType!='hidden') continue;
                break;
              case 5:  /* Button/Submit */
                if (sType!='button' && sType!='submit') continue;
                break;
            }
            if (T(o)) {
              // Text
              if (oRules[i].t==0 && (sType=='text' || sType=='email')) {
                if (!o.value || bOverwrite) {
                  o.value = sValue;
                  n++;
                }
              // Password
              } else if (oRules[i].t==1 && sType=='password') {
                if (!o.value || bOverwrite) {
                  o.value = sValue;
                  n++;
                }
              // Checkbox/Radio
              } else if (oRules[i].t==3 && (sType=='checkbox' || sType=='radio')) {
                sInts = sValue.replace(/\s+/g, '');
                if (sInts.indexOf('!')<0) {
                  // "1" checks and "0" unchecks
                  for (var k=0, kmax=sInts.length; k<kmax; k++) {
                    if (aI[j]) {
                      if (aI[j].checked!=parseInt(sInts.charAt(k))) {
                        aI[j].click();
                        n++;
                      }
                      j++;
                    }
                  }
                } else {
                  // Check/Uncheck all if string ends with "!"
                  switch (parseInt(sInts)) {
                    case 0:
                      if (o.checked) {
                        o.click();
                        n++;
                      }
                      break;
                    case 1:
                      if (!o.checked) {
                        o.click();
                        n++;
                      }
                      break;
                  }
                }
              // Hidden
              } else if (oRules[i].t==4 && sType=='hidden') {
                o.value = sValue;
                n++;
              // Buttons
              } else if (oRules[i].t==5 && (sType=='button' || sType=='submit')) {
                o.click();
                n++;
              }
            }
          }
          // Textareas
          for (var j=0, jmax=aT.length; j<jmax; j++) {
            o = aT[j];
            if (T(o) && oRules[i].t==0 && (!o.value || bOverwrite)) {
              o.value = sValue;
              n++;
            }
          }
          // iframe-based RTEs
          for (var j=0, jmax=aIF.length, oDoc, sHTML; j<jmax; j++) {
            o = aIF[j];
            // Skip third-party iframes
            if (o.src && !/^(about|data|javascript)/i.test(o.src)
              && o.src.indexOf(doc.location.protocol + '//' + doc.location.hostname)!=0) continue;
            if (T(o) && oRules[i].t==0) {
              oDoc = o.contentDocument;
              sHTML = oDoc.body.innerHTML;
              // Only autofill iframes if it contains no scripts
              // AND it's empty or if overwrite flag is on
              if (!/<script/i.test(sHTML) && (!sHTML.replace(reSpace, '') || bOverwrite)) {
                oDoc.body.innerHTML = sValue;
                n++;
              }
            }
          }
          // contentEditable divs
          for (var j=0, jmax=aD.length; j<jmax; j++) {
            o = aD[j];
            if (T(o) && oRules[i].t==0) {
              // Don't autofill empty divs unless overwrite flag is on
              if (!o.innerHTML.replace(reSpace, '') || bOverwrite) {
                o.innerHTML = sValue;
                n++;
              }
            }
          }
        // Selects
        } else {
          for (var j=0, jmax=aS.length; j<jmax; j++) {
            o = aS[j];
            if (T(o)) {
              // Initiate 'onchange' event handler
              var eChange = doc.createEvent('HTMLEvents');
              eChange.initEvent('change', true, true);
              // Select by text/value match
              if (/[^\d! ]|^0\d/.test(sValue)) {
                reLabel = new RegExp('^' + ((sValue.indexOf('"')<0)?sValue:sValue.replace(/"/g,'')) + '$', 'i');
                for (var k=0, imax=o.length; k<imax; k++) {
                  if (reLabel.test(o[k].value) || reLabel.test(o[k].text)) {
                    o[k].selected = true;
                    o.dispatchEvent(eChange);
                    n++;
                    break;
                  }
                }
              // Select by command (index numbers, !)
              } else {
                // Single select
                if (!isNaN(+sValue*parseInt(sValue))) {
                  if (o.selectedIndex!=sValue) {
                    o.selectedIndex = sValue;
                    o.dispatchEvent(eChange);
                    n++;
                  }
                // Multiple select
                } else if (sValue.indexOf(' ')>-1) {
                  aInts = sValue.replace(/ {2,}/g, ' ').split(' ');
                  o.selectedIndex = -1;  // unselect all
                  for (var k=0, kmax=aInts.length; k<kmax; k++) {
                    if (o[aInts[k]] && !o[aInts[k]].selected) {
                      o[aInts[k]].selected = true;
                      o.dispatchEvent(eChange);
                      n++;
                    }
                  }
                // Select/Unselect all
                } else {
                  if (!/^([01]?!|)$/.test(sValue)) continue;
                  for (var k=0, kmax=o.length; k<kmax; k++) {
                    switch (sValue=='!' || sValue=='1!') {
                      case true:
                        if (!o[k].selected) {
                          o[k].selected = true;
                          o.dispatchEvent(eChange);
                          n++;
                        }
                        break;
                      case false:
                        if (o[k].selected) {
                          o[k].selected = false;
                          o.dispatchEvent(eChange);
                          n++;
                        }
                        break;
                    }
                  }
                }
              }
            }
          }
        }
      }
      // Play sound effect
      if (oOther['sound'] && n>0) {
        var player = Cc['@mozilla.org/sound;1'].createInstance(Ci.nsISound),
          ios = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
        player.play(ios.newURI('chrome://autofill/content/sound.wav', null, null));
      }
    },
    /* Clean Regular Expressions */
    cleanRE: function(s) {
      // Strip comment
      s = s.replace(/\/\*.*?\*\/\s*/g, '');
      // Escape forward slashes
      s = s.replace(/\//g, '\\/') || '.';
      // Escape stand-alone quantifiers
      if (/^[+*?]|[^\\]([+*]{2}|[+*?]{3})|\[[^]]|\[\]/.test(s)) {
        s = s.replace(/([[+*?])/g, '\\$1');
      }
      return s;
    },
    // Traverse DOM backwards to find first text node
    findText: function(oNode, reTest) {
      var bFound = false,
        bAlt = false,
        /* Find text node */
        find = function(o, re) {
          var oElm;
          while (o) {
            switch (o.nodeType) {
              case 1:
                // Go down...
                if (o.lastChild && ((o.nodeName!='SELECT' && oNode.nodeName!='IFRAME' && o.nodeName.indexOf('SCRIPT')<0)
                  || (oNode.nodeName=='IFRAME' && o.nodeName!='DIV' && o.nodeName.slice(0, 1)!='H'))) find(o.lastChild, re);
                // Go up...
                else up(o, re);
                break;
              case 3:
                if (o.textContent.replace(/\W+/, '')) {
                  // Text found!
                  if (re.test(o.textContent)) bFound = true;
                  // Text not found -- trying alternate route...
                  else if (oNode.parentNode.nodeName=='TD' && oNode.nodeName!='IFRAME' && !bAlt) {
                    bAlt = true;
                    oElm = oNode.parentNode.previousSibling;
                    while (oElm && !oElm.lastChild) {
                      oElm = oElm.previousSibling;
                    }
                    // Alternate route found
                    if (oElm && oElm.lastChild) find(oElm.lastChild, re);
                    // No alternatives -- exiting...
                    else bFound = null;
                  // No matches found -- exiting...
                  } else bFound = null;
                } else up(o, re);
                break;
            }
            if (bFound || bFound==null) break;
            o = o.previousSibling;
          }
        },
        /* Go up until there's a parent node that has a previous sibling */
        up = function(o, re) {
          if (o.parentNode && !o.previousSibling) {
            var oElm = o.parentNode;
            while (oElm && !oElm.previousSibling) {
              oElm = oElm.parentNode;
            }
            if (oElm && oElm.previousSibling) find(oElm.previousSibling, re);
          }
        };
      find(oNode, reTest);
      return bFound || false;
    },
    /* Return random integer between nFrom and nTo */
    rand: function(nFrom, nTo) {
      return Math.round(Math.random()*(nTo-nFrom+1)+(nFrom-.5));
    },
    /* Show Options window */
    showPrefs: function() {
      if (!this.O || this.O.closed) this.O = window.openDialog('chrome://autofill/content/options.xul', '', 'centerscreen, chrome, dialog=no, resizable, toolbar');
      else this.O.focus();
    },
    /* Show Form Fields Wizard */
    showWizard: function() {
      var oParam = {
          i: {
            isField: this.field,
            target: gContextMenu.target,
            options: this.O
          }
        };
      if (!this.W || this.W.closed) this.W = window.openDialog('chrome://autofill/content/wizard.xul', '', 'alwaysRaised, centerscreen, chrome, dialog', oParam);
      else this.W.focus();
    }
  };
}