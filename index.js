var code = angular.module('code', ['ngMaterial']);

code.Events = {
  CHANGE_CONTENT_TYPE: 'CHANGE_CONTENT_TYPE',
  CHANGE_CONTENT: 'CHANGE_CONTENT'
};

code.directive('cancelSave', function() {
  var LOWER_S_CODE = 's'.charCodeAt(0);
  var UPPER_S_CODE = 'S'.charCodeAt(0);
  return {
    restrict: 'A',
    link: function(s, e) {
      $(e).keydown(function(event) {
        var isEssKey = event.which == LOWER_S_CODE || event.which == UPPER_S_CODE;
        if (isEssKey && event.ctrlKey) {  // CTRL S
          return false;
        } else if (event.which == 19) {  // CMD S
          return false;
        }
        return true;
      });
    }
  };
});

code.directive('synced', function($location) {
  var SYNC_FUDGE = 50;
  var path = $location.path();
  var ref = new Firebase('https://gcode.firebaseio.com/');
  var syncedContent, localTime;
  var mirror;
  return {
    restrict: 'A',
    require: 'mirror',
    link: function(s, e, a, c) {
      mirror = c;
      s.$on(code.Events.CHANGE_CONTENT, function(evt, content) {
        if (!evt.stopPropagation || syncedContent == content) return;
        syncedContent = content;
        var alreadySynced = !!localTime;
        localTime = new Date().getTime();
        if (!alreadySynced) return;  // Catching up.
        ref.child(path).set({'content': content, 'time': localTime});
        evt.stopPropagation();
      });
      ref.child(path).on('value', function(snapshot) {
        var value = snapshot.val();
        if (!value) return;
        var remoteTime = value.time;
        if (remoteTime <= localTime + SYNC_FUDGE) return;
        c.setContent(value.content);
      });
    }
  };
});

code.directive('mirror', function($rootScope) {
  var mirror, doc;
  var setContent = function(content) {
    if (content == doc.getValue()) return;
    var pos = doc.getCursor();
    doc.setValue(content);
    doc.setCursor(pos);
  }
  return {
    restrict: 'E',
    scope: {
      theme: '=',
      mode: '=',
    },
    controller: function() {
      this.setContent = setContent;
    },
    link: function(s, e) {
      mirror = CodeMirror(e[0], {
        lineNumbers: true,
        tabSize: 2
      });
      doc = mirror.getDoc();
      if (s['theme']) mirror.setOption('theme', s['theme']);
      if (s['mode']) mirror.setOption('mode', s['mode']);
      mirror.on('change', function() {
        s.$emit(code.Events.CHANGE_CONTENT, doc.getValue());
      });
      s.$on(code.Events.CHANGE_CONTENT_TYPE, function(evt, contentType) {
        mirror.setOption('mode', contentType);
      });
      s.$on(code.Events.CHANGE_CONTENT, function(evt, content) {
        setContent(content);
      });
    }
  };
});

code.directive('setContentType', function($rootScope) {
  return {
    restrict: 'A',
    scope: {
      'setContentType': '@'
    },
    link: function(s, e) {
      e.on('click', function() {
        e.prop('disabled', true);
        $rootScope.$broadcast(code.Events.CHANGE_CONTENT_TYPE, s['setContentType']);
      });
      s.$on(code.Events.CHANGE_CONTENT_TYPE, function(evt, contentType) {
        e.prop('disabled', contentType == s['setContentType']);
      });
    }
  }
});
