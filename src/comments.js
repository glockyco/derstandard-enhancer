(function (global) {
  'use strict';

  if (!global) {
    return;
  }

  var mode = 'native';
  var changeHandler = null;
  var documentObserver = null;
  var shadowObservers = [];
  var retryTimer = null;
  var currentRecord = null;
  var lastNotification = null;
  var active = false;

  function normalizeMode(value) {
    return value === 'positive' || value === 'negative' || value === 'total'
      ? value
      : 'native';
  }

  function notify(count, available) {
    var payload = {
      count: count,
      mode: mode,
      available: available
    };
    var signature = String(count) + '|' + String(mode) + '|' + String(available);
    if (signature === lastNotification) {
      return;
    }
    lastNotification = signature;
    if (typeof changeHandler === 'function') {
      try {
        changeHandler(payload);
      } catch (_) {
        // A consumer callback must not interfere with comment observation.
      }
    }
  }

  function parseRating(node, attribute) {
    if (!node || typeof node.getAttribute !== 'function') {
      return 0;
    }
    var raw;
    try {
      raw = node.getAttribute(attribute);
    } catch (_) {
      return 0;
    }
    if (typeof raw !== 'string') {
      return 0;
    }
    raw = raw.trim();
    if (!/^[+]?\d+$/.test(raw)) {
      return 0;
    }
    var value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  }

  function visible(node) {
    if (!node || typeof node.getAttribute !== 'function') {
      return false;
    }
    try {
      if (node.hidden || node.getAttribute('aria-hidden') === 'true') {
        return false;
      }
      var style = node.getAttribute('style') || '';
      if (/(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(style)) {
        return false;
      }
    } catch (_) {
      return false;
    }
    return true;
  }

  function visibleRating(node, attribute) {
    if (!node) {
      return null;
    }
    var logs = [];
    try {
      if (typeof node.querySelectorAll === 'function') {
        logs = Array.prototype.slice.call(node.querySelectorAll('dst-posting--ratinglog'));
      } else if (typeof node.querySelector === 'function') {
        var log = node.querySelector('dst-posting--ratinglog');
        if (log) {
          logs = [log];
        }
      }
    } catch (_) {
      return null;
    }
    for (var i = 0; i < logs.length; i += 1) {
      if (!visible(logs[i])) {
        continue;
      }
      var candidates = [logs[i]];
      try {
        var descendants = logs[i].querySelectorAll('[' + attribute + ']');
        for (var j = 0; j < descendants.length; j += 1) {
          candidates.push(descendants[j]);
        }
      } catch (_) {
        // The rating log itself is still a valid candidate.
      }
      for (var k = 0; k < candidates.length; k += 1) {
        if (!visible(candidates[k])) {
          continue;
        }
        var raw = candidates[k].getAttribute(attribute);
        if (typeof raw === 'string' && /^[+]?\d+$/.test(raw.trim())) {
          var value = Number(raw.trim());
          if (Number.isFinite(value)) {
            return value;
          }
        }
      }
    }
    return null;
  }

  function ratings(node) {
    var positive = visibleRating(node, 'positiveratings');
    var negative = visibleRating(node, 'negativeratings');
    if (positive === null) {
      positive = parseRating(node, 'positiveratings');
    }
    if (negative === null) {
      negative = parseRating(node, 'negativeratings');
    }
    return {
      positive: positive,
      negative: negative,
      total: positive + negative
    };
  }

  function findMain(root) {
    if (!root || typeof root.querySelector !== 'function') {
      return null;
    }
    try {
      return root.querySelector('section#forum main.forum--main');
    } catch (_) {
      return null;
    }
  }

  function discoverMain() {
    var doc = global.document;
    if (!doc || typeof doc.querySelectorAll !== 'function') {
      return null;
    }

    var hosts;
    try {
      hosts = doc.querySelectorAll('dst-forum');
    } catch (_) {
      return null;
    }

    for (var i = 0; i < hosts.length; i += 1) {
      var shadow;
      try {
        shadow = hosts[i].shadowRoot;
      } catch (_) {
        shadow = null;
      }
      if (!shadow) {
        continue;
      }
      attachShadowObserver(shadow);
      var main = findMain(shadow);
      if (main) {
        return main;
      }
    }
    return null;
  }

  function attachShadowObserver(shadow) {
    for (var i = 0; i < shadowObservers.length; i += 1) {
      if (shadowObservers[i].shadow === shadow) {
        return;
      }
    }

    if (typeof global.MutationObserver !== 'function') {
      return;
    }

    var observer;
    try {
      observer = new global.MutationObserver(function () {
        refresh();
      });
      observer.observe(shadow, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['positiveratings', 'negativeratings', 'style', 'hidden', 'aria-hidden']
      });
      shadowObservers.push({ shadow: shadow, observer: observer });
    } catch (_) {
      if (observer && typeof observer.disconnect === 'function') {
        observer.disconnect();
      }
    }
  }

  function collectNodes(main) {
    if (!main || typeof main.querySelectorAll !== 'function') {
      return [];
    }
    try {
      return Array.prototype.slice.call(
        main.querySelectorAll("dst-posting[data-level='0']")
      );
    } catch (_) {
      return [];
    }
  }

  function indexOfNode(nodes, node) {
    for (var i = 0; i < nodes.length; i += 1) {
      if (nodes[i] === node) {
        return i;
      }
    }
    return -1;
  }

  function synchronizeNativeOrder(record, nodes, preserveBaseline) {
    if (mode === 'native' && !preserveBaseline) {
      record.nativeOrder = nodes.slice();
      return;
    }
    var order = record.nativeOrder;
    for (var i = 0; i < nodes.length; i += 1) {
      if (indexOfNode(order, nodes[i]) === -1) {
        order.push(nodes[i]);
      }
    }
  }

  function compareNodes(a, b) {
    var ar = ratings(a.node);
    var br = ratings(b.node);
    var av = mode === 'positive' ? ar.positive : mode === 'negative' ? ar.negative : ar.total;
    var bv = mode === 'positive' ? br.positive : mode === 'negative' ? br.negative : br.total;
    if (av !== bv) {
      return bv - av;
    }
    return a.nativeIndex - b.nativeIndex;
  }

  function reorderGroup(parent, nodes, desired) {
    var unchanged = true;
    for (var i = 0; i < nodes.length; i += 1) {
      if (nodes[i] !== desired[i]) {
        unchanged = false;
        break;
      }
    }
    if (unchanged || !parent || typeof parent.insertBefore !== 'function') {
      return;
    }

    // Keep non-posting children in their exact slots while replacing the posting slots.
    var children = Array.prototype.slice.call(parent.childNodes || []);
    var postingSet = [];
    for (var j = 0; j < nodes.length; j += 1) {
      postingSet.push(nodes[j]);
    }
    var anchors = [];
    var nextNonPosting = null;
    for (var k = children.length - 1; k >= 0; k -= 1) {
      if (indexOfNode(postingSet, children[k]) === -1) {
        nextNonPosting = children[k];
      } else {
        anchors[k] = nextNonPosting;
      }
    }

    var fragment;
    var doc = global.document;
    if (doc && typeof doc.createDocumentFragment === 'function') {
      fragment = doc.createDocumentFragment();
      for (var m = 0; m < nodes.length; m += 1) {
        fragment.appendChild(nodes[m]);
      }
    } else {
      for (var n = 0; n < nodes.length; n += 1) {
        parent.removeChild(nodes[n]);
      }
    }

    var targetIndex = 0;
    for (var p = 0; p < children.length; p += 1) {
      if (indexOfNode(postingSet, children[p]) !== -1) {
        parent.insertBefore(desired[targetIndex], anchors[p] || null);
        targetIndex += 1;
      }
    }
  }

  function applyOrder(record, nodes) {
    if (!record || !nodes.length) {
      return;
    }

    var entries = [];
    for (var i = 0; i < nodes.length; i += 1) {
      entries.push({
        node: nodes[i],
        nativeIndex: indexOfNode(record.nativeOrder, nodes[i])
      });
    }

    var groups = [];
    for (var j = 0; j < entries.length; j += 1) {
      var parent = entries[j].node.parentNode;
      if (!parent) {
        continue;
      }
      var group = null;
      for (var g = 0; g < groups.length; g += 1) {
        if (groups[g].parent === parent) {
          group = groups[g];
          break;
        }
      }
      if (!group) {
        group = { parent: parent, entries: [] };
        groups.push(group);
      }
      group.entries.push(entries[j]);
    }

    for (var h = 0; h < groups.length; h += 1) {
      var groupEntries = groups[h].entries;
      var current = [];
      for (var c = 0; c < groupEntries.length; c += 1) {
        current.push(groupEntries[c].node);
      }
      var desired;
      if (mode === 'native') {
        desired = groupEntries.slice().sort(function (a, b) {
          return a.nativeIndex - b.nativeIndex;
        }).map(function (entry) {
          return entry.node;
        });
      } else {
        desired = groupEntries.slice().sort(function (a, b) {
          return compareNodes(a, b);
        }).map(function (entry) {
          return entry.node;
        });
      }
      // The selector returns document order, which is the native/current order.
      reorderGroup(groups[h].parent, current, desired);
    }
  }

  function scheduleRetry() {
    if (!active || currentRecord || retryTimer !== null || typeof global.setTimeout !== 'function') {
      return;
    }
    retryTimer = global.setTimeout(function () {
      retryTimer = null;
      refresh();
      if (active && !currentRecord) {
        scheduleRetry();
      }
    }, 250);
  }

  function refresh(preserveBaseline) {
    if (!active) {
      return;
    }
    var main = discoverMain();
    if (main !== (currentRecord && currentRecord.main)) {
      currentRecord = main ? { main: main, nativeOrder: [] } : null;
    }

    if (!currentRecord) {
      notify(0, false);
      scheduleRetry();
      return;
    }

    if (retryTimer !== null && typeof global.clearTimeout === 'function') {
      global.clearTimeout(retryTimer);
      retryTimer = null;
    }
    var nodes = collectNodes(currentRecord.main);
    synchronizeNativeOrder(currentRecord, nodes, preserveBaseline);
    applyOrder(currentRecord, nodes);
    notify(nodes.length, true);
  }

  function init(onChange) {
    disconnect();
    active = true;
    changeHandler = typeof onChange === 'function' ? onChange : null;
    lastNotification = null;

    var doc = global.document;
    if (doc && typeof global.MutationObserver === 'function') {
      try {
        documentObserver = new global.MutationObserver(function () {
          refresh();
        });
        documentObserver.observe(doc.documentElement || doc, {
          childList: true,
          subtree: true
        });
      } catch (_) {
        documentObserver = null;
      }
    }
    refresh();
  }

  function sort(nextMode) {
    var previousMode = mode;
    mode = normalizeMode(nextMode);
    if (active) {
      refresh(mode === 'native' && previousMode !== 'native');
    }
    return mode;
  }

  function currentMode() {
    return mode;
  }

  function disconnect() {
    if (documentObserver && typeof documentObserver.disconnect === 'function') {
      documentObserver.disconnect();
    }
    documentObserver = null;
    for (var i = 0; i < shadowObservers.length; i += 1) {
      if (shadowObservers[i].observer && typeof shadowObservers[i].observer.disconnect === 'function') {
        shadowObservers[i].observer.disconnect();
      }
    }
    shadowObservers = [];
    if (retryTimer !== null && typeof global.clearTimeout === 'function') {
      global.clearTimeout(retryTimer);
    }
    retryTimer = null;
    currentRecord = null;
    active = false;
    changeHandler = null;
    lastNotification = null;
  }

  global.DSUXComments = {
    init: init,
    sort: sort,
    currentMode: currentMode,
    disconnect: disconnect
  };
}(typeof window !== 'undefined' ? window : null));
